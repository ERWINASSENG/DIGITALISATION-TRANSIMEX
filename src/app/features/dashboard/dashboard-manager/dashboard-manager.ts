import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

export interface ManagerApprovalRequest {
  id: string;
  type: 'caisse' | 'conge' | 'logistique';
  title: string;
  initiator: string;
  detail: string;
  date: string;
  icon: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ManagerAlert {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  message: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-manager',
  imports: [RouterLink, MatIconModule],
  templateUrl: './dashboard-manager.html',
  styleUrl: './dashboard-manager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardManager {
  private readonly authService = inject(AuthService);

  public readonly currentUser = this.authService.currentUser;

  public readonly teamPresentCount = signal(11);
  public readonly teamTotalCount = signal(12);

  public readonly pendingRequests = signal<ManagerApprovalRequest[]>([
    {
      id: 'req-1',
      type: 'caisse',
      title: 'Décaissement Frais Manutention Quai #14',
      initiator: 'Marc Mbarga (Agent)',
      detail: 'Montant : 145 000 FCFA',
      date: 'Aujourd\'hui 08:30',
      icon: 'payments',
      status: 'pending',
    },
    {
      id: 'req-2',
      type: 'conge',
      title: 'Demande de Congé Annuel (4 jours)',
      initiator: 'Sandra Ngo (Facturation)',
      detail: 'Du 15/09 au 19/09/2026',
      date: 'Hier 16:45',
      icon: 'event_available',
      status: 'pending',
    },
    {
      id: 'req-3',
      type: 'logistique',
      title: 'Ordre de Transfert Conteneur #MSCU-88910',
      initiator: 'Alain Talla (Chauffeur)',
      detail: 'Parc à conteneurs Zone B',
      date: 'Aujourd\'hui 07:15',
      icon: 'local_shipping',
      status: 'pending',
    },
  ]);

  public readonly pendingCount = computed(() => {
    return this.pendingRequests().filter((r) => r.status === 'pending').length;
  });

  public readonly alerts = signal<ManagerAlert[]>([
    {
      id: 'alt-1',
      severity: 'warning',
      title: 'Capacité Quai #3 à 85%',
      message: 'Ralentissement potentiel lors du déchargement prévu à 14h.',
      icon: 'warning_amber',
    },
    {
      id: 'alt-2',
      severity: 'info',
      title: 'Arrivée Navire CMA-CGM',
      message: 'Accostage confirmé quai conteneurs à 11h30.',
      icon: 'directions_boat',
    },
    {
      id: 'alt-3',
      severity: 'info',
      title: 'Inventaire Trimestriel Stock',
      message: 'Planifié pour vendredi avec l\'équipe logistique.',
      icon: 'fact_check',
    },
  ]);

  public approveRequest(id: string): void {
    this.pendingRequests.update((reqs) =>
      reqs.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
    );
  }

  public rejectRequest(id: string): void {
    this.pendingRequests.update((reqs) =>
      reqs.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    );
  }
}
