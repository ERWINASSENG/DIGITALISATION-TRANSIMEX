import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CreateUserPayload, UpdateUserPayload, UserProfile, UserRole } from '../models/auth.model';
import { SupabaseService } from './supabase.service';
import { generateSecureUUID } from '../utils/crypto.utils';

const USERS_STORAGE_KEY = 'transmex_users_store';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _users = signal<UserProfile[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  public readonly users = this._users.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  // Statistiques calculées pour le tableau de bord et l'administration
  public readonly totalUsersCount = computed(() => this._users().length);
  public readonly activeUsersCount = computed(() => this._users().filter((u) => u.isActive).length);
  public readonly adminCount = computed(() => this._users().filter((u) => u.role === 'admin').length);
  public readonly rhCount = computed(() => this._users().filter((u) => u.role === 'rh').length);

  constructor() {
    this.loadInitialUsers();
  }

  /**
   * Charge la liste des utilisateurs depuis le stockage ou Supabase
   */
  public async loadInitialUsers(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      if (this.supabaseService.isConfigured() && this.supabaseService.supabase) {
        const { data, error } = await this.supabaseService.supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          const mapped: UserProfile[] = data.map((row) => ({
            id: row.id,
            email: row.email,
            firstName: row.first_name || 'Utilisateur',
            lastName: row.last_name || 'Transmex',
            role: (row.role as UserRole) || 'agent',
            department: row.department || 'Services Généraux',
            phone: row.phone,
            isActive: row.is_active ?? true,
            avatarUrl: row.avatar_url,
            createdAt: row.created_at,
            lastLoginAt: row.last_sign_in_at || undefined,
          }));

          this._users.set(mapped);
          this.saveToStorage(mapped);
          this._isLoading.set(false);
          return;
        }
      }

      // Mode Local / Persistance locale : ne conserver que les utilisateurs réels
      if (this.isBrowser) {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
          try {
            const parsed: UserProfile[] = JSON.parse(stored);
            // Filtrer pour éliminer automatiquement tout ancien compte de démo résiduel
            const demoEmails = ['admin@transmex.com', 'rh@transmex.com', 'stock@transmex.com', 'caisse@transmex.com', 'agent@transmex.com'];
            const cleanList = parsed.filter((u) => !demoEmails.includes(u.email.toLowerCase()));
            
            // Si des faux comptes étaient présents, réécrire le stockage propre
            if (cleanList.length !== parsed.length) {
              this.saveToStorage(cleanList);
            }
            
            this._users.set(cleanList);
            this._isLoading.set(false);
            return;
          } catch {
            this.clearAllUsers();
          }
        }
      }

      // Liste vide par défaut (aucune donnée de démonstration)
      this._users.set([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs';
      this._error.set(msg);
      this._users.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Crée un nouvel utilisateur avec attribution de rôle
   */
  public async createUser(payload: CreateUserPayload): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const email = payload.email.trim().toLowerCase();

      // Vérifier si l'email existe déjà
      const exists = this._users().some((u) => u.email.toLowerCase() === email);
      if (exists) {
        throw new Error(`Un utilisateur avec l'adresse email ${email} existe déjà.`);
      }

      const newId = generateSecureUUID();
      const newUser: UserProfile = {
        id: newId,
        email,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        role: payload.role,
        roles: [payload.role],
        department: payload.department?.trim() || 'Services Généraux',
        phone: payload.phone?.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Si Supabase est actif, enregistrer dans la table profiles
      if (this.supabaseService.isConfigured() && this.supabaseService.supabase) {
        await this.supabaseService.supabase.from('profiles').insert({
          id: newId,
          email: newUser.email,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          role: newUser.role,
          department: newUser.department,
          phone: newUser.phone,
          is_active: true,
          created_at: newUser.createdAt,
        });
      }

      const updatedList = [newUser, ...this._users()];
      this._users.set(updatedList);
      this.saveToStorage(updatedList);
      this._isLoading.set(false);

      return { success: true, user: newUser };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création du compte';
      this._error.set(msg);
      this._isLoading.set(false);
      return { success: false, error: msg };
    }
  }

  /**
   * Met à jour les informations ou le rôle d'un utilisateur existant
   */
  public async updateUser(id: string, payload: UpdateUserPayload): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      if (this.supabaseService.isConfigured() && this.supabaseService.supabase) {
        const updateData: Record<string, unknown> = {};
        if (payload.firstName !== undefined) updateData['first_name'] = payload.firstName;
        if (payload.lastName !== undefined) updateData['last_name'] = payload.lastName;
        if (payload.role !== undefined) updateData['role'] = payload.role;
        if (payload.department !== undefined) updateData['department'] = payload.department;
        if (payload.phone !== undefined) updateData['phone'] = payload.phone;
        if (payload.isActive !== undefined) updateData['is_active'] = payload.isActive;
        if (payload.avatarUrl !== undefined) updateData['avatar_url'] = payload.avatarUrl;

        await this.supabaseService.supabase.from('profiles').update(updateData).eq('id', id);
      }

      const updatedList = this._users().map((u) => {
        if (u.id === id) {
          return {
            ...u,
            firstName: payload.firstName ?? u.firstName,
            lastName: payload.lastName ?? u.lastName,
            role: payload.role ?? u.role,
            roles: payload.role ? [payload.role] : u.roles,
            department: payload.department ?? u.department,
            phone: payload.phone ?? u.phone,
            isActive: payload.isActive ?? u.isActive,
            avatarUrl: payload.avatarUrl ?? u.avatarUrl,
          };
        }
        return u;
      });

      this._users.set(updatedList);
      this.saveToStorage(updatedList);
      this._isLoading.set(false);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      this._error.set(msg);
      this._isLoading.set(false);
      return { success: false, error: msg };
    }
  }

  /**
   * Bascule le statut actif / inactif d'un compte
   */
  public async toggleUserStatus(id: string): Promise<void> {
    const user = this._users().find((u) => u.id === id);
    if (!user) return;
    await this.updateUser(id, { isActive: !user.isActive });
  }

  /**
   * Supprime un utilisateur
   */
  public async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);
    try {
      if (this.supabaseService.isConfigured() && this.supabaseService.supabase) {
        await this.supabaseService.supabase.from('profiles').delete().eq('id', id);
      }

      const updatedList = this._users().filter((u) => u.id !== id);
      this._users.set(updatedList);
      this.saveToStorage(updatedList);
      this._isLoading.set(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      this._error.set(msg);
      this._isLoading.set(false);
      return { success: false, error: msg };
    }
  }

  /**
   * Vide tous les utilisateurs enregistrés localement
   */
  public clearAllUsers(): void {
    this._users.set([]);
    if (this.isBrowser) {
      try {
        localStorage.removeItem(USERS_STORAGE_KEY);
      } catch {
        // Ignorer
      }
    }
  }

  private saveToStorage(list: UserProfile[]): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Ignorer
      }
    }
  }
}
