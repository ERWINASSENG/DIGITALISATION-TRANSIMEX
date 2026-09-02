import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupabaseService],
    });
    service = TestBed.inject(SupabaseService);
  });

  it('devrait être initialisé correctement', () => {
    expect(service).toBeTruthy();
  });

  it('devrait fournir un getter supabase sans erreur', () => {
    const client = service.supabase;
    // Client should either be initialized or null safely
    expect(client !== undefined).toBe(true);
  });

  it('devrait évaluer isConfigured sous forme de booléen', () => {
    expect(typeof service.isConfigured).toBe('boolean');
  });
});
