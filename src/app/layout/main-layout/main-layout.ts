import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavMenuItem, ROLE_DEFINITIONS } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  private readonly authService = inject(AuthService);

  public readonly currentUser = this.authService.currentUser;
  public readonly isSidebarOpen = signal<boolean>(false);
  public readonly isUserMenuOpen = signal<boolean>(false);

  // Éléments de navigation épurés sans icônes
  private readonly allMenuItems: NavMenuItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Tableau de Bord',
      route: '/dashboard',
      allowedRoles: ['admin', 'rh', 'manager_stock', 'caissier', 'agent'],
    },
    {
      id: 'nav-users',
      label: 'Gestion Utilisateurs & Rôles',
      route: '/admin/users',
      allowedRoles: ['admin'],
      badge: 'Admin',
      badgeVariant: 'primary',
    },
    {
      id: 'nav-hr',
      label: 'RH & Collaborateurs',
      route: '/hr',
      allowedRoles: ['admin', 'rh'],
      badge: 'Équipe',
      badgeVariant: 'success',
    },
    {
      id: 'nav-profile',
      label: 'Mon Profil & Sécurité',
      route: '/profile',
      allowedRoles: ['admin', 'rh', 'manager_stock', 'caissier', 'agent'],
    },
  ];

  // Filtrage dynamique des menus selon le rôle actif de l'utilisateur connecté
  public readonly visibleMenuItems = computed<NavMenuItem[]>(() => {
    const user = this.currentUser();
    if (!user) return [];
    if (user.role === 'admin') return this.allMenuItems;
    return this.allMenuItems.filter((item) => item.allowedRoles.includes(user.role));
  });

  public readonly currentRoleDefinition = computed(() => {
    const role = this.currentUser()?.role;
    return role ? ROLE_DEFINITIONS[role] : null;
  });

  public toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
  }

  public closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  public toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
  }

  public closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  public async logout(): Promise<void> {
    this.closeUserMenu();
    await this.authService.logout();
  }
}
