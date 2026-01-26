import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tables } from '../../../../types/supabase';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-category-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './category-form-modal.component.html',
  styleUrl: './category-form-modal.component.css'
})
export class CategoryFormModalComponent implements OnChanges {
  @Input() category: Tables<'categories'> | null = null;
  @Input() visible = false;
  @Input() loading = false;
  @Input() categories: Tables<'categories'>[] = []; // For parent selection
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;

  categoryTypes = [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'transfer', label: 'Transfer' }
  ];

  colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
    '#64748b', '#78716c'
  ];

  icons = [
    '🍔', '🛒', '🏠', '💡', '🚗', '🚌', '✈️', '🎮', '⚽', '📚',
    '💊', '🎁', '🐶', '👶', '👔', '💰', '💸', '🏦', '🔁', '❓'
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['expense', Validators.required],
      parent_id: [null],
      color: [this.colors[0]],
      icon: [this.icons[0]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category'] && this.category) {
      this.form.patchValue({
        name: this.category.name,
        type: this.category.type,
        parent_id: this.category.parent_id,
        color: this.category.color,
        icon: this.category.icon
      });
    } else if (changes['visible'] && this.visible && !this.category) {
      this.form.reset({
        name: '',
        type: 'expense',
        parent_id: null,
        color: this.colors[0],
        icon: this.icons[0]
      });
    }
  }

  get availableParents() {
    // Filter out:
    // 1. The category itself (if editing)
    // 2. Categories of different type (optional constraint, but usually safe to keep same type)
    // 3. Descendants (to avoid circles) - Implementing full circle check is complex, for now just filter self.
    const currentId = this.category?.id;
    return this.categories.filter(c =>
      c.id !== currentId &&
      (!this.form.value.type || c.type === this.form.value.type) // Enforce same type hierarchy
    );
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
