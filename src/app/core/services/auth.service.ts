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
    this.listenToAuthChanges();
  }

  /**
   * Écoute les changements d'état d'authentification Supabase
   */
  private listenToAuthChanges(): void {
    if (this.supabaseService.isConfigured() && this.supabaseService.supabase) {
      try {
        this.supabaseService.supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await this.loadUserProfileFromSupabase(session.user.id, session.user.email || '', session.access_token);
          } else if (event === 'SIGNED_OUT') {
            this.clearLocalSession();
          }
        });
      } catch {
        // Ignorer si échec d'écoute
      }
    }
  }

  /**
   * Récupère le profil complet depuis la table public.profiles
   */
  private async loadUserProfileFromSupabase(userId: string, email: string, accessToken: string): Promise<UserProfile | null> {
    if (!this.supabaseService.supabase) return null;

    try {
      const { data: profile } = await this.supabaseService.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const userProfile: UserProfile = {
        id: userId,
        email: email || profile?.email || '',
        firstName: profile?.first_name || 'Utilisateur',
        lastName: profile?.last_name || 'Transmex',
        role: (profile?.role as UserRole) || 'admin',
        roles: [(profile?.role as UserRole) || 'admin'],
        department: profile?.department || 'Direction Générale',
        phone: profile?.phone,
        isActive: profile?.is_active ?? true,
        avatarUrl: profile?.avatar_url,
        createdAt: profile?.created_at || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      this.setLocalSession(userProfile, accessToken);
      return userProfile;
    } catch {
      return null;
    }
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
      if (this.supabaseService.isConfigured() && this.supabaseService.supabase) {
        const { data, error } = await this.supabaseService.supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Message d'erreur utilisateur traduit et explicite
          let friendlyError = error.message;
          if (error.message.includes('Invalid login credentials')) {
            friendlyError = 'Identifiants invalides : email ou mot de passe incorrect.';
          } else if (error.message.includes('Email not confirmed')) {
            friendlyError = "L'adresse email n'a pas encore été confirmée dans Supabase.";
          }
          throw new Error(friendlyError);
        }

        if (data.user) {
          const profile = await this.loadUserProfileFromSupabase(
            data.user.id,
            data.user.email || email,
            data.session?.access_token || 'supabase-token'
          );

          if (profile) {
            this._isLoading.set(false);
            this.redirectAfterLogin();
            return { success: true };
          }
        }
      }

      // 2. Vérification dans le stockage local ou compte d'administration initial
      if (this.isBrowser) {
        // Reconnaissance immédiate de l'administrateur par défaut
        if (email === 'erwinalberic99@gmail.com' && password === 'Asseng12@') {
          const adminUser: UserProfile = {
            id: 'admin_erwin_001',
            email: 'erwinalberic99@gmail.com',
            firstName: 'Erwin',
            lastName: 'Alberic',
            role: 'admin',
            roles: ['admin'],
            department: 'Direction Générale',
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          this.setLocalSession(adminUser, 'admin-transmex-token');
          this._isLoading.set(false);
          this.redirectAfterLogin();
          return { success: true };
        }

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
   * Inscription d'un nouvel utilisateur dans Supabase Auth
   */
  public async signUp(email: string, password: string, profileData: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);
    this._authError.set(null);

    try {
      if (this.supabaseService.isConfigured() && this.supabaseService.supabase) {
        const { data, error } = await this.supabaseService.supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              first_name: profileData.firstName,
              last_name: profileData.lastName,
              role: profileData.role || 'agent',
              department: profileData.department || 'Services Généraux',
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Création correspondante dans public.profiles
          await this.supabaseService.supabase.from('profiles').upsert({
            id: data.user.id,
            email: email.trim().toLowerCase(),
            first_name: profileData.firstName || '',
            last_name: profileData.lastName || '',
            role: profileData.role || 'agent',
            department: profileData.department || 'Services Généraux',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      this._isLoading.set(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création du compte";
      this._authError.set(msg);
      this._isLoading.set(false);
      return { success: false, error: msg };
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

    this.clearLocalSession();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Efface la session locale
   */
  private clearLocalSession(): void {
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

