import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { AccountFormModalComponent } from '../../components/account-form-modal/account-form-modal.component';
import { Tables, TablesInsert, TablesUpdate } from '../../../../types/supabase';
import { User } from '@supabase/supabase-js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TransactionsService } from '../../../../core/services/transactions.service';

interface AccountWithTransactions extends Tables<'accounts'> {
  recentTransactions?: {
    id: string;
    description?: string | null; // Optional if you rely on category name
    amount: number;
    date: string;
    // We get a joined object from Supabase, usually has categories: { icon, color, ... }
    categories?: {
      name: string;
      icon: string;
      color: string;
      type: string;
    } | null;
  }[];
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
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadAccounts();
      }
    });
  }

  loadAccounts() {
    if (!this.user) return;
    this.loading = true;
    this.accountsService.getAccounts(this.user.id).subscribe({
      next: (data) => {
        this.accounts = data; // Assign base accounts data
        this.loading = false;

        // Fetch recent transactions for each account
        this.accounts.forEach(acc => {
          if (!this.user) return; // Safety check
          this.transactionsService.getTransactions(this.user.id, 0, 3, { accountId: acc.id })
            .subscribe(res => {
              acc.recentTransactions = res.data;
            });
        });
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
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

  deleteAccount(id: string, event: Event) {
    event.stopPropagation();
    if (confirm(this.translate.instant('ACCOUNTS.DELETE_CONFIRM'))) {
      this.accountsService.deleteAccount(id).subscribe({
        next: () => {
          this.loadAccounts();
        },
        error: (err) => console.error(err)
      });
    }
  }
}
