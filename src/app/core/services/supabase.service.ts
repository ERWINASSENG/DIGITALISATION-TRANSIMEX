import { Injectable, PLATFORM_ID, inject, signal, makeStateKey, TransferState } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const SUPABASE_CONFIG_KEY = makeStateKey<SupabaseConfig>('supabase.config');

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly transferState = inject(TransferState);

  private client: SupabaseClient | null = null;
  private readonly _isConfigured = signal<boolean>(false);
  private readonly _supabaseUrl = signal<string>('');

  public readonly isConfigured = this._isConfigured.asReadonly();
  public readonly supabaseUrl = this._supabaseUrl.asReadonly();

  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.initSupabaseClient();
  }

  /**
   * Initialise le client Supabase :
   * 1. Côté serveur : lit process.env et stocke dans TransferState
   * 2. Côté client : lit d'abord le TransferState (instantané et sans stockage local)
   */
  public initSupabaseClient(): void {
    let url = '';
    let key = '';

    if (!this.isBrowser) {
      // Côté serveur (SSR) : lecture directe depuis l'environnement
      if (typeof process !== 'undefined' && process.env) {
        url = process.env['SUPABASE_URL'] || '';
        key = process.env['SUPABASE_ANON_KEY'] || '';
      }

      if (url && key) {
        this.transferState.set(SUPABASE_CONFIG_KEY, { url, anonKey: key });
      }
    } else {
      // Côté navigateur : récupération immédiate depuis le TransferState injecté par le serveur
      const transferredConfig = this.transferState.get(SUPABASE_CONFIG_KEY, null);
      if (transferredConfig && transferredConfig.url && transferredConfig.anonKey) {
        url = transferredConfig.url;
        key = transferredConfig.anonKey;
      }
    }

    this.applyConfig(url, key);

    // Si côté navigateur la configuration n'était pas dans le TransferState (ex: CSR direct ou rechargement),
    // interroger l'endpoint /api/supabase-config en tâche de fond.
    if (this.isBrowser && !this._isConfigured()) {
      this.ensureInitialized();
    }
  }

  /**
   * Garantit que le client Supabase est initialisé avant toute action (login, requêtes).
   */
  public async ensureInitialized(): Promise<boolean> {
    if (this._isConfigured() && this.client) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (!this.isBrowser) {
        return this._isConfigured();
      }

      try {
        const response = await fetch('/api/supabase-config');
        if (response.ok) {
          const config: SupabaseConfig = await response.json();
          if (config.url && config.anonKey) {
            this.applyConfig(config.url, config.anonKey);
            return this._isConfigured();
          }
        }
      } catch {
        // En cas d'erreur de requête
      }

      return this._isConfigured();
    })();

    const result = await this.initPromise;
    this.initPromise = null;
    return result;
  }

  private applyConfig(url: string, key: string): void {
    const isValid = !!(
      url &&
      key &&
      !url.includes('placeholder') &&
      !url.includes('your-project') &&
      !url.includes('demo-transmex')
    );

    this._isConfigured.set(isValid);
    this._supabaseUrl.set(url);

    if (isValid) {
      try {
        this.client = createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: this.isBrowser ? localStorage : undefined,
          },
        });
      } catch {
        this.client = null;
        this._isConfigured.set(false);
      }
    } else {
      this.client = null;
    }
  }

  /**
   * Permet de configurer manuellement l'URL et la clé anonyme en mémoire si nécessaire.
   */
  public updateConfig(config: SupabaseConfig): boolean {
    if (!config.url || !config.anonKey) return false;
    this.applyConfig(config.url, config.anonKey);
    return this._isConfigured();
  }

  /**
   * Retourne l'instance du client Supabase
   */
  get supabase(): SupabaseClient | null {
    return this.client;
  }
}

