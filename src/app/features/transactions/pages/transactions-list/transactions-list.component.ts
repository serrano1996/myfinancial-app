import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { TransactionsService } from '../../../../core/services/transactions.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { TransactionFormModalComponent } from '../../components/transaction-form-modal/transaction-form-modal.component';
import { CsvImportModalComponent } from '../../components/csv-import-modal/csv-import-modal.component';
import { Tables, TablesInsert } from '../../../../types/supabase';
import { User } from '@supabase/supabase-js';
import * as Papa from 'papaparse';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, finalize, timeout } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TransactionFormModalComponent, CsvImportModalComponent, TranslateModule],
  templateUrl: './transactions-list.component.html',
  styleUrl: './transactions-list.component.css'
})
export class TransactionsListComponent implements OnInit {
  transactions: any[] = [];
  filteredTransactions: any[] = []; // Filtered list for display
  loading = true;
  user: User | null = null;

  // Filters
  accountId = '';
  categoryId = '';
  startDate = '';
  endDate = '';
  searchTerm = ''; // For local text search
  showFilters = true;

  // Data for Filters & Modals
  accounts: Tables<'accounts'>[] = [];
  categories: Tables<'categories'>[] = [];

  // Modal State
  showModal = false;
  showImportModal = false;
  editingTransaction: any | null = null;
  modalLoading = false;

  constructor(
    private transactionsService: TransactionsService,
    private accountsService: AccountsService,
    private categoriesService: CategoriesService,
    private authService: AuthService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.authService.user$.pipe(
      distinctUntilChanged((prev: User | null | undefined, curr: User | null | undefined) => prev?.id === curr?.id)
    ).subscribe((user: User | null | undefined) => {
      this.user = user ?? null;
      if (user) {
        this.loadDependencies();
        this.loadTransactions();
      } else {
        this.loading = false;
      }
    });
  }


  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  loadDependencies() {
    if (!this.user) return;
    this.accountsService.getAccounts(this.user.id).subscribe(data => this.accounts = data);
    this.categoriesService.getCategories(this.user.id).subscribe(data => this.categories = data);
  }

  loadTransactions() {
    if (!this.user) return;
    this.loading = true;

    const filters = {
      accountId: this.accountId || undefined,
      categoryId: this.categoryId || undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined
    };

    this.transactionsService.getTransactions(this.user.id, 0, 50, filters)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges(); // Force update
        })
      )
      .subscribe({
        next: (response: any) => {
          this.transactions = response.data;
          this.filterTransactionsLocal(); // Apply local search filter
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  // Local filtering for search term
  filterTransactionsLocal() {
    if (!this.transactions) {
      this.filteredTransactions = [];
      return;
    }
    if (!this.searchTerm) {
      this.filteredTransactions = [...this.transactions];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredTransactions = this.transactions.filter(tx =>
      (tx.description && tx.description.toLowerCase().includes(term)) ||
      (tx.categories?.name && tx.categories.name.toLowerCase().includes(term)) ||
      (tx.accounts?.name && tx.accounts.name.toLowerCase().includes(term))
    );
  }

  openCreateModal() {
    this.editingTransaction = null;
    this.showModal = true;
  }

  openEditModal(transaction: any) {
    this.editingTransaction = transaction;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingTransaction = null;
  }

  openImportModal() {
    this.showImportModal = true;
  }

  closeImportModal() {
    this.showImportModal = false;
  }

  handleImport(file: File) {
    if (!this.user) return;
    this.modalLoading = true;
    this.closeImportModal();

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const transactionsToInsert: TablesInsert<'transactions'>[] = [];

        const findAccount = (name: string) => this.accounts.find(a => a.name.toLowerCase() === name?.toLowerCase());
        const findCategory = (name: string) => this.categories.find(c => c.name.toLowerCase() === name?.toLowerCase());
        const defaultAccount = this.accounts[0];

        for (const row of rows) {
          const account = findAccount(row['Account']) || defaultAccount;
          const category = findCategory(row['Category']);

          if (account && category) {
            transactionsToInsert.push({
              user_id: this.user!.id,
              account_id: account.id,
              category_id: category.id,
              amount: parseFloat(row['Amount']),
              date: row['Date'] || new Date().toISOString().split('T')[0],
              description: row['Description'] || ''
            });
          }
        }

        if (transactionsToInsert.length > 0) {
          // Ideally batch, but robust method loops
          for (const tx of transactionsToInsert) {
            await this.transactionsService.createTransaction(tx).toPromise();
          }

          this.loadTransactions();
          this.modalLoading = false;
        } else {
          alert(this.translate.instant('TRANSACTIONS.IMPORT_MODAL.ALERT_NO_VALID'));
          this.modalLoading = false;
        }
      },
      error: (err) => {
        console.error(err);
        this.modalLoading = false;
      }
    });
  }

  handleSave(formData: any) {
    if (!this.user) return;
    this.modalLoading = true;

    if (this.editingTransaction) {
      // Check if it's a transfer to update both linked transactions
      if (this.editingTransaction.type === 'transfer') {
        const { destination_account_id, ...transactionData } = formData;

        // Update the current transaction
        this.transactionsService.updateTransaction(this.editingTransaction.id, transactionData).subscribe({
          next: () => {
            // Find and update the linked transaction
            const linkedTx = this.findLinkedTransferTransaction(this.editingTransaction);
            if (linkedTx) {
              // Update linked transaction with same changes (except account-specific fields)
              const linkedUpdate = {
                description: transactionData.description,
                date: transactionData.date,
                category_id: transactionData.category_id,
                type: 'transfer' as const,
                // Keep the linked transaction's amount and account_id
                amount: linkedTx.amount,
                account_id: linkedTx.account_id,
                // Update notes to reflect any description changes
                notes: linkedTx.notes
              };

              this.transactionsService.updateTransaction(linkedTx.id, linkedUpdate).subscribe({
                next: () => {
                  this.loadTransactions();
                  this.closeModal();
                  this.modalLoading = false;
                },
                error: (err) => {
                  console.error('Error updating linked transfer:', err);
                  // Show success anyway since main transaction was updated
                  this.loadTransactions();
                  this.closeModal();
                  this.modalLoading = false;
                }
              });
            } else {
              this.loadTransactions();
              this.closeModal();
              this.modalLoading = false;
            }
          },
          error: () => this.modalLoading = false
        });
      } else {
        // Regular transaction (income or expense) - not a transfer
        const { destination_account_id, ...transactionData } = formData;

        this.transactionsService.updateTransaction(this.editingTransaction.id, transactionData).subscribe({
          next: () => {
            this.loadTransactions();
            this.closeModal();
            this.modalLoading = false;
          },
          error: () => this.modalLoading = false
        });
      }
    } else {
      // Check if it's a transfer to create two linked transactions
      if (formData.type === 'transfer' && formData.destination_account_id) {
        // Get account names for notes
        const sourceAccount = this.accounts.find(a => a.id === formData.account_id);
        const destAccount = this.accounts.find(a => a.id === formData.destination_account_id);

        // Create outgoing transaction (from source account)
        const outgoingTx: TablesInsert<'transactions'> = {
          user_id: this.user.id,
          account_id: formData.account_id,
          amount: Math.abs(formData.amount), // Store as positive, display handles sign
          date: formData.date,
          description: formData.description,
          type: 'transfer',
          category_id: formData.category_id,
          notes: `${formData.notes ? formData.notes + '\n' : ''}Transfer to ${destAccount?.name || 'Unknown account'}`
        };

        // Create incoming transaction (to destination account)
        const incomingTx: TablesInsert<'transactions'> = {
          user_id: this.user.id,
          account_id: formData.destination_account_id,
          amount: Math.abs(formData.amount), // Store as positive, display handles sign
          date: formData.date,
          description: formData.description,
          type: 'transfer',
          category_id: formData.category_id,
          notes: `${formData.notes ? formData.notes + '\n' : ''}Transfer from ${sourceAccount?.name || 'Unknown account'}`
        };

        // Create both transactions
        this.transactionsService.createTransaction(outgoingTx).subscribe({
          next: () => {
            // First transaction created, now create the second
            this.transactionsService.createTransaction(incomingTx).subscribe({
              next: () => {
                this.loadTransactions();
                this.closeModal();
                this.modalLoading = false;
              },
              error: (err) => {
                console.error('Error creating incoming transfer transaction:', err);
                this.modalLoading = false;
              }
            });
          },
          error: (err) => {
            console.error('Error creating outgoing transfer transaction:', err);
            this.modalLoading = false;
          }
        });
      } else {
        // Regular transaction (income or expense)
        const { destination_account_id, ...transactionData } = formData;

        const newTx: TablesInsert<'transactions'> = {
          user_id: this.user.id,
          ...transactionData
        };
        this.transactionsService.createTransaction(newTx).subscribe({
          next: () => {
            this.loadTransactions();
            this.closeModal();
            this.modalLoading = false;
          },
          error: () => this.modalLoading = false
        });
      }
    }
  }

  deleteTransaction(id: string, event: Event) {
    event.stopPropagation();

    // Find the transaction being deleted
    const transaction = this.transactions.find(t => t.id === id);
    const isTransfer = transaction?.type === 'transfer';

    Swal.fire({
      title: this.translate.instant('TRANSACTIONS.DELETE_CONFIRM'),
      text: isTransfer
        ? 'This is a transfer. Both linked transactions will be deleted.'
        : this.translate.instant('COMMON.CONFIRM_DELETE'),
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
        // Delete the main transaction
        this.transactionsService.deleteTransaction(id).subscribe({
          next: () => {
            // If it's a transfer, find and delete the linked transaction
            if (isTransfer && transaction) {
              const linkedTx = this.findLinkedTransferTransaction(transaction);
              if (linkedTx) {
                this.transactionsService.deleteTransaction(linkedTx.id).subscribe({
                  next: () => {
                    this.showDeleteSuccessMessage();
                    this.loadTransactions();
                  },
                  error: (err) => {
                    console.error('Error deleting linked transfer transaction:', err);
                    this.showDeleteSuccessMessage(); // Show success even if linked delete fails
                    this.loadTransactions();
                  }
                });
              } else {
                this.showDeleteSuccessMessage();
                this.loadTransactions();
              }
            } else {
              this.showDeleteSuccessMessage();
              this.loadTransactions();
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire({
              title: this.translate.instant('COMMON.DELETE'),
              text: this.translate.instant('TRANSACTIONS.DELETE_ERROR'),
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

  // Helper method to find the linked transfer transaction
  private findLinkedTransferTransaction(transaction: any): any | null {
    if (transaction.type !== 'transfer') return null;

    // Look for a transaction with:
    // - Same absolute amount (one negative, one positive)
    // - Same date
    // - Same description
    // - Different account_id
    return this.transactions.find(t =>
      t.id !== transaction.id &&
      t.type === 'transfer' &&
      Math.abs(t.amount) === Math.abs(transaction.amount) &&
      t.date === transaction.date &&
      t.description === transaction.description &&
      t.account_id !== transaction.account_id
    ) || null;
  }

  private showDeleteSuccessMessage() {
    Swal.fire({
      title: this.translate.instant('COMMON.DELETE'),
      text: this.translate.instant('TRANSACTIONS.DELETE_SUCCESS'),
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      background: '#1e293b',
      color: '#fff',
      heightAuto: false
    });
  }

  // Get the sign (+/-) to display for a transaction amount
  getAmountSign(tx: any): string {
    if (tx.type === 'transfer') {
      // For transfers, check the notes to determine direction
      if (tx.notes?.includes('Transfer to')) {
        return '-'; // Outgoing transfer (money leaving)
      } else if (tx.notes?.includes('Transfer from')) {
        return '+'; // Incoming transfer (money arriving)
      }
      // Fallback for transfers without proper notes
      return '-';
    }

    // For regular income/expense transactions
    return tx.categories?.type === 'expense' ? '-' : '+';
  }
}
