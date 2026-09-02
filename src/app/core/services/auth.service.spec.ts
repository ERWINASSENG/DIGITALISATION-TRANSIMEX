import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

describe('AuthService', () => {
  let service: AuthService;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        {
          provide: SupabaseService,
          useValue: {
            supabase: null,
            isConfigured: false,
          },
        },
      ],
    });

    localStorage.clear();
    service = TestBed.inject(AuthService);
  });

  it('devrait être créé avec un état non authentifié par défaut sans fausses données', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('devrait échouer proprement lors d une tentative avec des identifiants inconnus', async () => {
    const result = await service.login({
      email: 'inconnu@transmex.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(service.authError()).toBeTruthy();
  });

  it('devrait vider la session et rediriger vers le login lors de la déconnexion', async () => {
    await service.logout();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
