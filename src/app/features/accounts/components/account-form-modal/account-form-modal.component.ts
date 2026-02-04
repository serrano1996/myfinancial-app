import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { Tables } from '../../../../types/supabase';
import { TranslateModule } from '@ngx-translate/core';
import { ICON_LIBRARY, IconDefinition } from '../../../../core/constants/icon-library';
import { ColorPickerDirective } from 'ngx-color-picker';

@Component({
  selector: 'app-account-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, ColorPickerDirective],
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
  searchControl = new FormControl('');
  searchTerm: string = '';
  customColor: string = '#3b82f6';

  // Filter only finance-related icons for Accounts
  allIcons: IconDefinition[] = ICON_LIBRARY.filter(icon =>
    icon.tags.some(tag => ['money', 'bill', 'shopping', 'business', 'work', 'office'].includes(tag))
  );

  accountTypes = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment' },
    { value: 'other', label: 'Other' }
  ];

  colors: string[] = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
    '#64748b', '#78716c', '#84cc16', '#06b6d4', '#d946ef', '#f43f5e'
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['cash'], // Optional - not required
      balance: [0],
      color: [this.colors[0]],
      icon: [this.allIcons[0]?.icon || '💰']
    });

    this.searchControl.valueChanges.subscribe(val => {
      this.searchTerm = val || '';
    });
  }

  // Filter based on search
  get filteredIcons(): string[] {
    if (!this.searchTerm) {
      return this.allIcons.map(def => def.icon);
    }
    const term = this.searchTerm.toLowerCase();
    return this.allIcons
      .filter(def =>
        def.icon.includes(term) ||
        def.tags.some(tag => tag.toLowerCase().includes(term))
      )
      .map(def => def.icon);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account'] && this.account) {
      console.log('Account type from DB:', this.account.type); // Debug
      console.log('Account data:', this.account); // Debug

      // Ensure type is one of the valid values or empty
      const validTypes = ['cash', 'bank', 'credit', 'investment', 'other'];
      const accountType = validTypes.includes(this.account.type as string) ? this.account.type : '';

      this.form.patchValue({
        name: this.account.name,
        type: accountType,
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
        icon: this.allIcons[0]?.icon || '💰'
      });
      this.searchControl.setValue('');
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

  addColorToList(color: string) {
    if (color && !this.colors.includes(color)) {
      this.colors.push(color);
    }
    this.selectColor(color);
  }

  removeColor(color: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.colors = this.colors.filter(c => c !== color);

    if (this.form.value.color === color) {
      if (this.colors.length > 0) {
        this.selectColor(this.colors[0]);
      } else {
        this.selectColor('');
      }
    }
  }

  selectIcon(icon: string) {
    this.form.patchValue({ icon });
  }

  get isCustomColor(): boolean {
    const currentColor = this.form.value.color;
    return !!currentColor && !this.colors.includes(currentColor);
  }
}
