import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { AccountFormModalComponent } from '../../components/account-form-modal/account-form-modal.component';
import { Tables, TablesInsert, TablesUpdate } from '../../../../types/supabase';
import { User } from '@supabase/supabase-js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { distinctUntilChanged, finalize, timeout } from 'rxjs';
import { TransactionsService } from '../../../../core/services/transactions.service';

interface AccountWithTransactions extends Omit<Tables<'accounts'>, 'balance'> {
  transactionCount?: number;
  balance: number | null;
}

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [CommonModule, AccountFormModalComponent, TranslateModule],
  templateUrl: './accounts-list.component.html',
  styleUrl: './accounts-list.component.css'
})
export class AccountsListComponent implements OnInit {
  accounts: AccountWithTransactions[] = [];
  loading = true;
  user: User | null = null;

  // Modal State
  showModal = false;
  editingAccount: Tables<'accounts'> | null = null;
  modalLoading = false;

  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService, // Inject TransactionService
    private authService: AuthService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.authService.user$.pipe(
      distinctUntilChanged((prev: User | null | undefined, curr: User | null | undefined) => prev?.id === curr?.id)
    ).subscribe(user => {
      this.user = user ?? null;
      if (user) {
        this.loadAccounts();
      }
    });
  }

  loadAccounts() {
    if (!this.user) return;
    this.loading = true;
    this.accountsService.getAccounts(this.user.id)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.accounts = data.map(acc => ({ ...acc, transactionCount: 0, balance: acc.balance })); // Assign base accounts data

          // Fetch transaction count for each account (Balance is now MANUAL, not calculated)
          this.accounts.forEach(acc => {
            if (!this.user) return;

            // Get transactions count only (limit 1 for efficiency if possible, but service might fetch all)
            // We keep this to show the count badge if it exists
            this.transactionsService.getTransactions(this.user.id, 0, 1, { accountId: acc.id })
              .subscribe(res => {
                acc.transactionCount = res.count;
                // REMOVED: Balance auto-calculation. Now relies on DB value.
                this.cdr.detectChanges();
              });
          });
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  openCreateModal() {
    this.editingAccount = null;
    this.showModal = true;
  }

  openEditModal(account: Tables<'accounts'>) {
    this.editingAccount = account;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingAccount = null;
  }

  handleSave(formData: any) {
    if (!this.user) return;
    this.modalLoading = true;

    // Use formData directly (including balance) - Balance is manually managed
    if (this.editingAccount) {
      // Update
      const updates: TablesUpdate<'accounts'> = {
        ...formData
      };

      this.accountsService.updateAccount(this.editingAccount.id, updates).subscribe({
        next: () => {
          this.loadAccounts();
          this.closeModal();
          this.modalLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.modalLoading = false;
        }
      });
    } else {
      // Create
      const newAccount: TablesInsert<'accounts'> = {
        user_id: this.user.id,
        ...formData
      };

      this.accountsService.createAccount(newAccount).subscribe({
        next: () => {
          this.loadAccounts();
          this.closeModal();
          this.modalLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.modalLoading = false;
        }
      });
    }
  }

  finishSave() {
    this.loadAccounts();
    this.closeModal();
    this.modalLoading = false;
  }

  deleteAccount(id: string, event: Event) {
    event.stopPropagation();

    Swal.fire({
      title: this.translate.instant('ACCOUNTS.DELETE_CONFIRM_TITLE'),
      text: this.translate.instant('ACCOUNTS.DELETE_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('COMMON.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL'),
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      background: '#1e293b',
      color: '#fff',
      heightAuto: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.accountsService.deleteAccount(id).subscribe({
          next: () => {
            Swal.fire({
              title: this.translate.instant('ACCOUNTS.DELETE_SUCCESS_TITLE'),
              text: this.translate.instant('ACCOUNTS.DELETE_SUCCESS_TEXT'),
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
              background: '#1e293b',
              color: '#fff',
              heightAuto: false
            });
            this.loadAccounts();
          },
          error: (err) => {
            console.error(err);
            Swal.fire({
              title: this.translate.instant('ACCOUNTS.DELETE_ERROR_TITLE'),
              text: this.translate.instant('ACCOUNTS.DELETE_ERROR_TEXT'),
              icon: 'error',
              background: '#1e293b',
              color: '#fff',
              heightAuto: false
            });
          }
        });
      }
    });
  }
}
