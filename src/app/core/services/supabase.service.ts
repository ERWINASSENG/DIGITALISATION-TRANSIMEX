import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_STORAGE_KEY = 'transmex_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private client: SupabaseClient | null = null;
  private readonly _isConfigured = signal<boolean>(false);
  private readonly _supabaseUrl = signal<string>('');

  public readonly isConfigured = this._isConfigured.asReadonly();
  public readonly supabaseUrl = this._supabaseUrl.asReadonly();

  constructor() {
    this.initSupabaseClient();
  }

  /**
   * Initialise le client Supabase en lisant les variables d'environnement
   * ou la configuration sauvegardée localement dans le navigateur.
   */
  public initSupabaseClient(): void {
    let url = '';
    let key = '';

    // 1. Lecture depuis les variables d'environnement (process.env ou globals)
    if (typeof process !== 'undefined' && process.env) {
      url = process.env['SUPABASE_URL'] || '';
      key = process.env['SUPABASE_ANON_KEY'] || '';
    }

    // 2. Lecture depuis le stockage local si non défini dans l'environnement
    if ((!url || !key) && this.isBrowser) {
      try {
        const stored = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
        if (stored) {
          const parsed: SupabaseConfig = JSON.parse(stored);
          if (parsed.url && parsed.anonKey) {
            url = parsed.url;
            key = parsed.anonKey;
          }
        }
      } catch {
        // Ignorer l'erreur d'accès stockage
      }
    }

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
      // Instance par défaut sécurisée
      try {
        this.client = createClient('https://demo-transmex.supabase.co', 'placeholder-anon-key', {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
      } catch {
        this.client = null;
      }
    }
  }

  /**
   * Permet de mettre à jour manuellement l'URL et la clé anonyme de Supabase
   */
  public updateConfig(config: SupabaseConfig): boolean {
    if (!config.url || !config.anonKey) return false;

    if (this.isBrowser) {
      try {
        localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
      } catch {
        // Ignorer
      }
    }

    this.initSupabaseClient();
    return this._isConfigured();
  }

  /**
   * Retourne l'instance du client Supabase
   */
  get supabase(): SupabaseClient | null {
    return this.client;
  }
}

