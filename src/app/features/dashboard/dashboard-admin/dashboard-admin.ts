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
      totalTreasury: 0,
      totalEmployees: userCount,
      activeAccounts: activeCount,
      dailyOpsCount: 0,
      pendingApprovals: 0,
    };
  });

  public readonly departments = signal<DepartmentSummary[]>([]);

  public readonly auditLogs = signal<AuditLogItem[]>([]);

  public formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
