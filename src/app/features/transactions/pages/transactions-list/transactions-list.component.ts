import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { TransactionsService } from '../../../../core/services/transactions.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { TransactionFormModalComponent } from '../../components/transaction-form-modal/transaction-form-modal.component';
import { CsvImportModalComponent } from '../../components/csv-import-modal/csv-import-modal.component';
import { Tables, TablesInsert, TablesUpdate } from '../../../../types/supabase';
import { User } from '@supabase/supabase-js';
import * as Papa from 'papaparse';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TransactionFormModalComponent, CsvImportModalComponent, TranslateModule],
  templateUrl: './transactions-list.component.html',
  styleUrl: './transactions-list.component.css'
})
export class TransactionsListComponent implements OnInit {
  transactions: any[] = []; // Using any to handle joined types easier in template or define interface interface TransactionWithDetails extends Tables<'transactions'> { accounts: ... }
  loading = true;
  user: User | null = null;

  // Filters
  accountId = '';
  categoryId = '';
  startDate = '';
  endDate = '';

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
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadDependencies();
        this.loadTransactions();
      }
    });
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

    this.transactionsService.getTransactions(this.user.id, 0, 50, filters).subscribe({
      next: (response) => {
        this.transactions = response.data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
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
    this.closeImportModal(); // Close modal immediately, show loading spinner somewhere else or generic

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const transactionsToInsert: TablesInsert<'transactions'>[] = [];

        // Helper to find ID by name
        const findAccount = (name: string) => this.accounts.find(a => a.name.toLowerCase() === name?.toLowerCase());
        const findCategory = (name: string) => this.categories.find(c => c.name.toLowerCase() === name?.toLowerCase());

        // Default Account/Category if not found? For now skip
        const defaultAccount = this.accounts[0];

        for (const row of rows) {
          // Expected columns: Date, Amount, Description, Category, Account
          // If Account column missing, use default.

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
          // Sequential insertion to allow trigger updating balance correctly? 
          // Trigger works on each row insert, so batch insert should work fine too if trigger handles concurrency or we insert loop.
          // Supabase batch insert.

          // To be safe with triggers, loop? Or batch. Trigger is FOR EACH ROW.
          // const { error } = await this.transactionsService.createTransaction(transactionsToInsert as any); // Type cast as service method assumes single, need to update service or loop

          // Service method createTransaction takes single. I should add bulkCreate or loop.
          // Loop for now.

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
      this.transactionsService.updateTransaction(this.editingTransaction.id, formData).subscribe({
        next: () => {
          this.loadTransactions();
          this.closeModal();
          this.modalLoading = false;
        },
        error: () => this.modalLoading = false
      });
    } else {
      const newTx: TablesInsert<'transactions'> = {
        user_id: this.user.id,
        ...formData
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

  deleteTransaction(id: string, event: Event) {
    event.stopPropagation();
    if (confirm(this.translate.instant('TRANSACTIONS.DELETE_CONFIRM'))) {
      this.transactionsService.deleteTransaction(id).subscribe(() => this.loadTransactions());
    }
  }
}
