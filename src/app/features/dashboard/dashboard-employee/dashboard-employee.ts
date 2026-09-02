import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-employee',
  imports: [RouterLink, MatIconModule],
  templateUrl: './dashboard-employee.html',
  styleUrl: './dashboard-employee.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardEmployee {
  private readonly authService = inject(AuthService);

  public readonly currentUser = this.authService.currentUser;
}
