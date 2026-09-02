import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('Dashboard Component', () => {
  let component: Dashboard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        AuthService,
        UserService,
        {
          provide: SupabaseService,
          useValue: { isConfigured: false, supabase: null },
        },
      ],
    });

    const fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  });

  it('devrait être initialisé correctement', () => {
    expect(component).toBeTruthy();
    expect(component.currentUser()).toBeTruthy();
  });

  it('devrait calculer la définition du rôle actif', () => {
    expect(component.currentRoleDef()?.id).toBe('admin');
  });
});
