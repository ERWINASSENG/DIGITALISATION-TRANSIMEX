import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';

export interface CashTransaction {
  id: string;
  type: 'encaissement' | 'decaissement';
  amount: number;
  category: string;
  description: string;
  created_at: string;
  created_by?: string;
}

@Component({
  selector: 'app-cashier-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cashier-management.html',
  styleUrl: './cashier-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashierManagementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);
  public readonly authService = inject(AuthService);

  public readonly transactions = signal<CashTransaction[]>([
    {
      id: '1',
      type: 'encaissement',
      amount: 450000,
      category: 'Prestation',
      description: 'Règlement facture N° 2026-089',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      type: 'decaissement',
      amount: 25000,
      category: 'Fournitures',
      description: 'Achat consommables bureau',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  public readonly isLoading = signal<boolean>(false);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly successMessage = signal<string | null>(null);

  public readonly totalIn = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'encaissement')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  public readonly totalOut = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'decaissement')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  public readonly currentBalance = computed(() => this.totalIn() - this.totalOut());

  public readonly transactionForm = this.fb.group({
    type: ['encaissement', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(100)]],
    category: ['Prestation', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(3)]]
  });

  public onSubmitTransaction(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.transactionForm.value;

    const newTx: CashTransaction = {
      id: crypto.randomUUID(),
      type: formVal.type as 'encaissement' | 'decaissement',
      amount: Number(formVal.amount),
      category: formVal.category || 'Général',
      description: formVal.description || '',
      created_at: new Date().toISOString()
    };

    setTimeout(() => {
      this.transactions.update((list) => [newTx, ...list]);
      this.isSubmitting.set(false);
      this.transactionForm.reset({
        type: 'encaissement',
        amount: null,
        category: 'Prestation',
        description: ''
      });
      this.successMessage.set('Opération de caisse enregistrée avec succès.');
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 400);
  }

  public formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(amount);
  }
}
