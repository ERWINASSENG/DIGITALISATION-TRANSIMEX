import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthSession, LoginCredentials, UserProfile, UserRole } from '../models/auth.model';
import { SupabaseService } from './supabase.service';

const SESSION_STORAGE_KEY = 'transmex_auth_session';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Signaux réactifs pour l'état d'authentification
  private readonly _currentUser = signal<UserProfile | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _authError = signal<string | null>(null);

  // Signaux publics dérivés
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly token = this._token.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly authError = this._authError.asReadonly();

  public readonly isAuthenticated = computed(() => this._currentUser() !== null);
  public readonly currentRole = computed<UserRole | null>(() => this._currentUser()?.role ?? null);
  public readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');
  public readonly isRH = computed(() => this._currentUser()?.role === 'rh' || this._currentUser()?.role === 'admin');

  constructor() {
    this.restoreSession();
  }

  /**
   * Restaure la session enregistrée dans le stockage local ou via Supabase
   */
  public restoreSession(): void {
    if (this.isBrowser) {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const session: AuthSession = JSON.parse(stored);
          if (session.user && (!session.expiresAt || session.expiresAt > Date.now())) {
            this._currentUser.set(session.user);
            this._token.set(session.token);
          }
        }
      } catch {
        try {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {
          // Ignorer
        }
      }
    }
  }

  /**
   * Connexion par email et mot de passe
   */
  public async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);
    this._authError.set(null);

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    try {
      // 1. Authentification via Supabase si configuré
      if (this.supabaseService.isConfigured && this.supabaseService.supabase) {
        const { data, error } = await this.supabaseService.supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.user) {
          const { data: profile } = await this.supabaseService.supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            firstName: profile?.first_name || 'Utilisateur',
            lastName: profile?.last_name || 'Transmex',
            role: (profile?.role as UserRole) || 'agent',
            department: profile?.department || 'Services Généraux',
            phone: profile?.phone,
            isActive: profile?.is_active ?? true,
            avatarUrl: profile?.avatar_url,
            createdAt: data.user.created_at,
            lastLoginAt: new Date().toISOString(),
          };

          this.setLocalSession(userProfile, data.session?.access_token || 'supabase-token');
          this._isLoading.set(false);
          this.redirectAfterLogin();
          return { success: true };
        }
      }

      // 2. Vérification dans le stockage local des utilisateurs créés
      if (this.isBrowser) {
        const storedUsersStr = localStorage.getItem('transmex_users_store');
        if (storedUsersStr) {
          try {
            const users: UserProfile[] = JSON.parse(storedUsersStr);
            const user = users.find((u) => u.email.toLowerCase() === email && u.isActive);
            if (user) {
              const updatedUser: UserProfile = {
                ...user,
                lastLoginAt: new Date().toISOString(),
              };
              this.setLocalSession(updatedUser, `session-token-${user.id}`);
              this._isLoading.set(false);
              this.redirectAfterLogin();
              return { success: true };
            }
          } catch {
            // Ignorer
          }
        }
      }

      const errorMessage = 'Identifiants invalides ou compte introuvable.';
      this._authError.set(errorMessage);
      this._isLoading.set(false);
      return { success: false, error: errorMessage };
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion';
      this._authError.set(errMessage);
      this._isLoading.set(false);
      return { success: false, error: errMessage };
    }
  }

  /**
   * Vérifie si l'utilisateur connecté possède un rôle donné
   */
  public hasRole(requiredRoles: UserRole | UserRole[]): boolean {
    const current = this._currentUser();
    if (!current || !current.isActive) return false;
    
    // L'administrateur a un accès complet universel
    if (current.role === 'admin') return true;

    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return rolesArray.includes(current.role);
  }

  /**
   * Déconnexion sécurisée et réinitialisation de session
   */
  public async logout(): Promise<void> {
    if (this.supabaseService.supabase) {
      try {
        await this.supabaseService.supabase.auth.signOut();
      } catch {
        // Ignorer en mode local
      }
    }

    if (this.isBrowser) {
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Ignorer
      }
    }
    this._currentUser.set(null);
    this._token.set(null);
    this._authError.set(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Sauvegarde interne de session
   */
  public setLocalSession(user: UserProfile, token: string): void {
    this._currentUser.set(user);
    this._token.set(token);
    this._authError.set(null);

    const session: AuthSession = {
      user,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 heures
    };

    if (this.isBrowser) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Ignorer si stockage inaccessible
      }
    }
  }

  /**
   * Redirection post-authentification
   */
  private redirectAfterLogin(): void {
    this.router.navigate(['/dashboard']);
  }
}
