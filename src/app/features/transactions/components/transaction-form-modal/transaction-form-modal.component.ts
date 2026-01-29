import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tables } from '../../../../types/supabase';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-transaction-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './transaction-form-modal.component.html',
  styleUrl: './transaction-form-modal.component.css'
})
export class TransactionFormModalComponent implements OnChanges {
  @Input() transaction: Tables<'transactions'> | null = null;
  @Input() visible = false;
  @Input() loading = false;
  @Input() accounts: Tables<'accounts'>[] = [];
  @Input() categories: Tables<'categories'>[] = [];

  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  filteredCategories: Tables<'categories'>[] = [];
  transactionTypes = [
    { value: 'expense', label: 'CATEGORIES.MODAL.TYPES.EXPENSE', icon: '📉' },
    { value: 'income', label: 'CATEGORIES.MODAL.TYPES.INCOME', icon: '📈' },
    { value: 'transfer', label: 'CATEGORIES.MODAL.TYPES.TRANSFER', icon: '↔️' }
  ];

  constructor(private fb: FormBuilder) {
    const today = new Date().toISOString().split('T')[0];
    this.form = this.fb.group({
      type: ['expense'], // Default to expense
      account_id: ['', Validators.required],
      category_id: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      date: [today, Validators.required],
      description: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories']) {
      this.filterCategories();
    }

    if (changes['transaction'] && this.transaction) {
      // Find category type from transaction's category
      const category = this.categories.find(c => c.id === this.transaction!.category_id);
      // Use transaction type if available (DB persistence), otherwise infer from category
      const type = this.transaction?.type || (category ? category.type : 'expense');

      this.form.patchValue({
        type: type,
        account_id: this.transaction.account_id,
        category_id: this.transaction.category_id,
        amount: this.transaction.amount,
        date: this.transaction.date,
        description: this.transaction.description,
        notes: this.transaction.notes
      });
      this.filterCategories();
    } else if (changes['visible'] && this.visible && !this.transaction) {
      const today = new Date().toISOString().split('T')[0];
      this.form.reset({
        type: 'expense',
        account_id: this.accounts.length > 0 ? this.accounts[0].id : '',
        category_id: '',
        amount: null,
        date: today,
        description: '',
        notes: ''
      });
      this.filterCategories();
    }
  }

  filterCategories() {
    const type = this.form.get('type')?.value;
    if (type) {
      this.filteredCategories = this.categories.filter(c => c.type === type);

      // If current category selection isn't valid for new type, reset it
      const currentCatId = this.form.get('category_id')?.value;
      const isValid = this.filteredCategories.find(c => c.id === currentCatId);
      if (!isValid && this.filteredCategories.length > 0) {
        // Optional: auto-select first one? or just clear
        this.form.patchValue({ category_id: '' });
      }
    } else {
      this.filteredCategories = [...this.categories];
    }
  }

  setType(type: string) {
    this.form.patchValue({ type });
    this.filterCategories();
  }

  onSubmit() {
    if (this.form.valid) {
      // Send the complete form value including 'type'
      this.save.emit(this.form.value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
