import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

export interface EmployeeTask {
  id: string;
  title: string;
  category: string;
  dueTime: string;
  priority: 'haute' | 'normale' | 'basse';
  completed: boolean;
}

export interface EmployeePersonalRequest {
  id: string;
  title: string;
  detail: string;
  date: string;
  status: 'validé' | 'en attente';
}

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

  public readonly tasks = signal<EmployeeTask[]>([
    {
      id: 'task-1',
      title: 'Contrôle des manifestes conteneurs Quai #2',
      category: 'Transit Maritime',
      dueTime: '11h30',
      priority: 'haute',
      completed: false,
    },
    {
      id: 'task-2',
      title: 'Saisie des quittances de douane dossier #DOU-990',
      category: 'Facturation & Douane',
      dueTime: '14h00',
      priority: 'haute',
      completed: true,
    },
    {
      id: 'task-3',
      title: 'Vérification du rapport journalier de caisse',
      category: 'Trésorerie',
      dueTime: '16h30',
      priority: 'normale',
      completed: false,
    },
    {
      id: 'task-4',
      title: 'Archivage des bons de livraison signés',
      category: 'Administration',
      dueTime: '17h15',
      priority: 'basse',
      completed: false,
    },
  ]);

  public readonly completedTasksCount = computed(() => {
    return this.tasks().filter((t) => t.completed).length;
  });

  public readonly remainingTasksCount = computed(() => {
    return this.tasks().filter((t) => !t.completed).length;
  });

  public readonly myRequests = signal<EmployeePersonalRequest[]>([
    {
      id: 'req-1',
      title: 'Demande de Congé Payé (3 jours)',
      detail: 'Période du 10 au 13 Octobre 2026',
      date: '01 Sept. 2026',
      status: 'en attente',
    },
    {
      id: 'req-2',
      title: 'Remboursement Frais Déplacement Port',
      detail: 'Frais de transport 25 000 FCFA',
      date: '28 Août 2026',
      status: 'validé',
    },
  ]);

  public toggleTask(taskId: string): void {
    this.tasks.update((taskList) =>
      taskList.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  }
}
