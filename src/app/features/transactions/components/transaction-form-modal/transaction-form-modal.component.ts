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

  constructor(private fb: FormBuilder) {
    const today = new Date().toISOString().split('T')[0];
    this.form = this.fb.group({
      account_id: ['', Validators.required],
      category_id: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      date: [today, Validators.required],
      description: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transaction'] && this.transaction) {
      this.form.patchValue({
        account_id: this.transaction.account_id,
        category_id: this.transaction.category_id,
        amount: this.transaction.amount,
        date: this.transaction.date,
        description: this.transaction.description
      });
    } else if (changes['visible'] && this.visible && !this.transaction) {
      const today = new Date().toISOString().split('T')[0];
      this.form.reset({
        account_id: this.accounts.length > 0 ? this.accounts[0].id : '',
        category_id: '',
        amount: null,
        date: today,
        description: ''
      });
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
