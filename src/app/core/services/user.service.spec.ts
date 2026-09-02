import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { SupabaseService } from './supabase.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
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
    service = TestBed.inject(UserService);
  });

  it('devrait être instancié avec une liste d\'utilisateurs par défaut', () => {
    expect(service).toBeTruthy();
    expect(service.users().length).toBeGreaterThan(0);
    expect(service.totalUsersCount()).toBe(service.users().length);
  });

  it('devrait créer un nouvel utilisateur avec succès', async () => {
    const initialCount = service.users().length;
    const result = await service.createUser({
      email: 'nouveau.collaborateur@transmex.com',
      firstName: 'Tarik',
      lastName: 'Haddad',
      role: 'rh',
      department: 'Ressources Humaines',
      phone: '+213 555 11 22 33',
    });

    expect(result.success).toBe(true);
    expect(service.users().length).toBe(initialCount + 1);
    expect(service.users()[0].email).toBe('nouveau.collaborateur@transmex.com');
  });

  it('devrait rejeter la création d\'un utilisateur avec un email déjà existant', async () => {
    const result = await service.createUser({
      email: 'admin@transmex.com',
      firstName: 'Doublon',
      lastName: 'Test',
      role: 'agent',
    });

    expect(result.success).toBe(false);
    expect(service.error()).toBeTruthy();
  });

  it('devrait modifier les informations et le rôle d\'un utilisateur', async () => {
    const firstUser = service.users()[0];
    const updateResult = await service.updateUser(firstUser.id, {
      department: 'Direction Stratégique',
      role: 'admin',
    });

    expect(updateResult.success).toBe(true);
    const updated = service.users().find((u) => u.id === firstUser.id);
    expect(updated?.department).toBe('Direction Stratégique');
  });

  it('devrait basculer l\'état actif / inactif d\'un compte utilisateur', async () => {
    const user = service.users()[0];
    const initialStatus = user.isActive;

    await service.toggleUserStatus(user.id);
    const updated = service.users().find((u) => u.id === user.id);
    expect(updated?.isActive).toBe(!initialStatus);
  });

  it('devrait supprimer un utilisateur de la liste', async () => {
    const userToDelete = service.users()[0];
    const initialCount = service.users().length;

    const result = await service.deleteUser(userToDelete.id);
    expect(result.success).toBe(true);
    expect(service.users().length).toBe(initialCount - 1);
    expect(service.users().some((u) => u.id === userToDelete.id)).toBe(false);
  });
});
