import { TestBed } from '@angular/core/testing';
import { HrManagement } from './hr-management';
import { UserService } from '../../core/services/user.service';
import { SupabaseService } from '../../core/services/supabase.service';

describe('HrManagement Component', () => {
  let component: HrManagement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HrManagement],
      providers: [
        UserService,
        {
          provide: SupabaseService,
          useValue: { isConfigured: false, supabase: null },
        },
      ],
    });

    const fixture = TestBed.createComponent(HrManagement);
    component = fixture.componentInstance;
  });

  it('devrait être créé avec succès', () => {
    expect(component).toBeTruthy();
    expect(component.users().length).toBeGreaterThan(0);
  });

  it('devrait extraire les départements uniques', () => {
    const depts = component.departments();
    expect(depts.includes('all')).toBe(true);
  });
});
