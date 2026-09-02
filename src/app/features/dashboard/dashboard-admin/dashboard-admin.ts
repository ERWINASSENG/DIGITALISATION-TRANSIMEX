import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

export interface DepartmentSummary {
  name: string;
  amount: number;
  percentage: number;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
}

export interface AuditLogItem {
  id: string;
  user: string;
  description: string;
  time: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-admin',
  imports: [RouterLink, MatIconModule],
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAdmin {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  public readonly currentUser = this.authService.currentUser;
  public readonly users = this.userService.users;

  public readonly stats = computed(() => {
    const userCount = this.userService.totalUsersCount();
    const activeCount = this.userService.activeUsersCount();

    return {
      totalTreasury: 48500000,
      totalEmployees: 48,
      activeAccounts: activeCount > 0 ? activeCount : userCount,
      dailyOpsCount: 34,
      pendingApprovals: 5,
    };
  });

  public readonly departments = signal<DepartmentSummary[]>([
    { name: 'Transit & Fret Maritime', amount: 24500000, percentage: 51, color: 'blue' },
    { name: 'Logistique & Manutention', amount: 14200000, percentage: 29, color: 'emerald' },
    { name: 'Douane & Consignation', amount: 6800000, percentage: 14, color: 'amber' },
    { name: 'Services Généraux & Administration', amount: 3000000, percentage: 6, color: 'purple' },
  ]);

  public readonly auditLogs = signal<AuditLogItem[]>([
    {
      id: 'log-1',
      user: 'Directeur Financier',
      description: 'Validation de la clôture de caisse Siège #CL-2026-088',
      time: 'Il y a 12 min',
      icon: 'verified',
    },
    {
      id: 'log-2',
      user: 'Responsable RH',
      description: 'Enregistrement du contrat CDI - Agent Maritime #EMP-049',
      time: 'Il y a 45 min',
      icon: 'person_add',
    },
    {
      id: 'log-3',
      user: 'Système TRANSIMEX',
      description: 'Sauvegarde automatique des données Supabase effectuée',
      time: 'Il y a 2h',
      icon: 'cloud_done',
    },
    {
      id: 'log-4',
      user: 'Super Admin',
      description: 'Mise à jour des politiques de sécurité et accès utilisateurs',
      time: 'Il y a 3h',
      icon: 'security',
    },
  ]);

  public formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
