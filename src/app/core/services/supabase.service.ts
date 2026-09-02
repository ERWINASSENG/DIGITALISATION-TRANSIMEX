import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private client: SupabaseClient | null = null;
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  public readonly isConfigured: boolean;

  constructor() {
    // Attempt to load from global process environment or client constants
    const envUrl = typeof process !== 'undefined' && process.env ? process.env['SUPABASE_URL'] : '';
    const envKey = typeof process !== 'undefined' && process.env ? process.env['SUPABASE_ANON_KEY'] : '';

    this.supabaseUrl = envUrl || 'https://demo-transmex.supabase.co';
    this.supabaseAnonKey = envKey || 'demo-anon-key-placeholder';
    this.isConfigured = !!(envUrl && envKey && !envUrl.includes('placeholder') && !envUrl.includes('demo-transmex'));

    try {
      this.client = createClient(this.supabaseUrl, this.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch {
      this.client = null;
    }
  }

  get supabase(): SupabaseClient | null {
    return this.client;
  }
}
