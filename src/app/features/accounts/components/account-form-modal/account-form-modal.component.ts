import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tables } from '../../../../types/supabase';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-account-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './account-form-modal.component.html',
  styleUrl: './account-form-modal.component.css'
})
export class AccountFormModalComponent implements OnChanges {
  @Input() account: Tables<'accounts'> | null = null;
  @Input() visible = false;
  @Input() loading = false;
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;

  accountTypes = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment' },
    { value: 'other', label: 'Other' }
  ];

  colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
  ];

  icons = [
    '💰', '🏦', '💳', '📈', '👛', '🏠', '🚗', '🎓', '✈️', '🛒'
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['cash', Validators.required],
      balance: [0],
      color: [this.colors[0]],
      icon: [this.icons[0]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account'] && this.account) {
      this.form.patchValue({
        name: this.account.name,
        type: this.account.type,
        balance: this.account.balance,
        color: this.account.color,
        icon: this.account.icon
      });
    } else if (changes['visible'] && this.visible && !this.account) {
      this.form.reset({
        name: '',
        type: 'cash',
        balance: 0,
        color: this.colors[0],
        icon: this.icons[0]
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

  selectColor(color: string) {
    this.form.patchValue({ color });
  }

  selectIcon(icon: string) {
    this.form.patchValue({ icon });
  }
}
