import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainLayout } from './main-layout';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('MainLayout Component', () => {
  let component: MainLayout;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [
        provideRouter([]),
        AuthService,
        {
          provide: SupabaseService,
          useValue: { isConfigured: false, supabase: null },
        },
      ],
    });

    const fixture = TestBed.createComponent(MainLayout);
    component = fixture.componentInstance;
  });

  it('devrait être créé avec succès', () => {
    expect(component).toBeTruthy();
  });

  it('devrait filtrer les éléments de la navigation selon le rôle', () => {
    const items = component.visibleMenuItems();
    expect(items.length).toBeGreaterThan(0);
    // Doit contenir Dashboard et Profil
    expect(items.some((i) => i.route === '/dashboard')).toBe(true);
    expect(items.some((i) => i.route === '/profile')).toBe(true);
  });

  it('devrait ouvrir et fermer la sidebar mobile', () => {
    expect(component.isSidebarOpen()).toBe(false);
    component.toggleSidebar();
    expect(component.isSidebarOpen()).toBe(true);
    component.closeSidebar();
    expect(component.isSidebarOpen()).toBe(false);
  });
});
