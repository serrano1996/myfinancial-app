import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tables } from '../../../../types/supabase';
import { TranslateModule } from '@ngx-translate/core';
import { ICON_LIBRARY, IconDefinition } from '../../../../core/constants/icon-library';

import { ColorPickerDirective } from 'ngx-color-picker';

@Component({
  selector: 'app-category-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, ColorPickerDirective],
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
  searchControl = new FormControl('');
  searchTerm: string = '';
  customColor: string = '#3b82f6'; // Default for picker

  // Store the full library
  allIcons: IconDefinition[] = ICON_LIBRARY;

  categoryTypes = [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'savings', label: 'Savings' }
  ];

  // Mutable colors array
  colors: string[] = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
    '#64748b', '#78716c', '#84cc16', '#06b6d4', '#d946ef', '#f43f5e'
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      name_en: [''],
      type: ['expense', Validators.required],
      parent_id: [null],
      color: [this.colors[0]],
      icon: [this.allIcons[0].icon]
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
        // Match icon itself or any tag
        def.icon.includes(term) ||
        def.tags.some(tag => tag.toLowerCase().includes(term))
      )
      .map(def => def.icon);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category'] && this.category) {
      this.form.patchValue({
        name: this.category.name,
        name_en: this.category.name_en,
        type: this.category.type,
        parent_id: this.category.parent_id,
        color: this.category.color,
        icon: this.category.icon
      });
    } else if (changes['visible'] && this.visible && !this.category) {
      this.form.reset({
        name: '',
        name_en: '',
        type: 'expense',
        parent_id: null,
        color: this.colors[0],
        icon: this.allIcons[0].icon
      });
      this.searchControl.setValue('');
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

  // Renamed to imply explicit action
  addColorToList(color: string) {
    if (color && !this.colors.includes(color)) {
      this.colors.push(color);
    }
    this.selectColor(color);
  }

  removeColor(color: string, event: Event) {
    event.stopPropagation();
    event.preventDefault(); // Prevent selection
    this.colors = this.colors.filter(c => c !== color);

    // If we deleted the selected color, select the first one
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
