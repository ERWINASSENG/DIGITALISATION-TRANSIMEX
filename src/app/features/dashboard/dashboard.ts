import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROLE_DEFINITIONS } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly supabaseService = inject(SupabaseService);

  public readonly currentUser = this.authService.currentUser;
  public readonly isSupabaseConfigured = this.supabaseService.isConfigured;

  public readonly users = this.userService.users;
  public readonly totalUsersCount = this.userService.totalUsersCount;
  public readonly activeUsersCount = this.userService.activeUsersCount;
  public readonly rhCount = this.userService.rhCount;

  public readonly isAdmin = this.authService.isAdmin;
  public readonly isRH = this.authService.isRH;

  public readonly currentRoleDef = computed(() => {
    const role = this.currentUser()?.role;
    return role ? ROLE_DEFINITIONS[role] : null;
  });

  public readonly recentUsers = computed(() => {
    return this.userService.users().slice(0, 4);
  });
}
