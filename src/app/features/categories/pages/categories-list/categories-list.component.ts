import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { forkJoin, of, Observable, distinctUntilChanged, finalize, timeout } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { CategoryFormModalComponent } from '../../components/category-form-modal/category-form-modal.component';
import { Tables, TablesInsert, TablesUpdate } from '../../../../types/supabase';
import { User } from '@supabase/supabase-js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface CategoryNode extends Tables<'categories'> {
  children?: CategoryNode[];
  level?: number;
}

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [CommonModule, CategoryFormModalComponent, TranslateModule],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.css'
})
export class CategoriesListComponent implements OnInit {
  categories: Tables<'categories'>[] = [];
  groupedCategories: { [key: string]: CategoryNode[] } = {
    income: [],
    expense: [],
    savings: []
  };

  loading = true;
  user: User | null = null;

  // Modal State
  showModal = false;
  editingCategory: Tables<'categories'> | null = null;
  modalLoading = false;

  constructor(
    private categoriesService: CategoriesService,
    private authService: AuthService,
    public translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.authService.user$.pipe(
      distinctUntilChanged((prev: User | null | undefined, curr: User | null | undefined) => prev?.id === curr?.id)
    ).subscribe(user => {
      this.user = user ?? null;
      if (user) {
        this.loadCategories();
      } else {
        this.loading = false;
      }
    });
  }

  loadCategories() {
    if (!this.user) return;
    this.loading = true;
    this.categoriesService.getCategories(this.user.id)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.categories = data;
          this.buildTree();
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  buildTree() {
    this.groupedCategories = { income: [], expense: [], savings: [] };

    // Helper to recursively finding children
    const getChildren = (parentId: string, allCats: Tables<'categories'>[], level: number): CategoryNode[] => {
      return allCats
        .filter(c => c.parent_id === parentId)
        .map(c => ({
          ...c,
          level,
          children: getChildren(c.id, allCats, level + 1)
        }));
    };

    // Process roots per type
    ['income', 'expense', 'savings'].forEach(type => {
      const typeCats = this.categories.filter(c => c.type === type);
      const roots = typeCats.filter(c => !c.parent_id);
      this.groupedCategories[type] = roots.map(root => ({
        ...root,
        level: 0,
        children: getChildren(root.id, typeCats, 1) // Only look within same type for simplicity, though schema allows cross-type technically logic usually forbids
      }));
    });
  }

  openCreateModal() {
    this.editingCategory = null;
    this.showModal = true;
  }

  openEditModal(category: Tables<'categories'>, event: Event) {
    event.stopPropagation();
    this.editingCategory = category;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingCategory = null;
  }

  handleSave(formData: any) {
    if (!this.user) return;
    this.modalLoading = true;

    if (this.editingCategory) {
      // Update
      const updates: TablesUpdate<'categories'> = {
        ...formData
      };
      this.categoriesService.updateCategory(this.editingCategory.id, updates).subscribe({
        next: () => {
          this.loadCategories();
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
      const newCategory: TablesInsert<'categories'> = {
        user_id: this.user.id,
        ...formData
      };
      this.categoriesService.createCategory(newCategory).subscribe({
        next: () => {
          this.loadCategories();
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



  deleteCategory(id: string, event: Event) {
    event.stopPropagation();

    Swal.fire({
      title: this.translate.instant('CATEGORIES.DELETE_CONFIRM_TITLE') || 'Are you sure?',
      text: this.translate.instant('CATEGORIES.DELETE_CONFIRM_TEXT') || 'Sub-categories will be moved to the root level.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: this.translate.instant('COMMON.DELETE') || 'Delete',
      cancelButtonText: this.translate.instant('COMMON.CANCEL') || 'Cancel',
      background: '#1e293b',
      color: '#fff'
    }).then((result: any) => {
      if (result.isConfirmed) {
        const categoryToDelete = this.categories.find(c => c.id === id);
        const parentId = categoryToDelete?.parent_id || null;

        // Find children
        const children = this.categories.filter(c => c.parent_id === id);

        let updateObservable$: Observable<any>;

        if (children.length > 0) {
          const updates = children.map(child =>
            this.categoriesService.updateCategory(child.id, { parent_id: parentId })
          );
          updateObservable$ = forkJoin(updates);
        } else {
          updateObservable$ = of(null);
        }

        updateObservable$.pipe(
          switchMap(() => this.categoriesService.deleteCategory(id))
        ).subscribe({
          next: () => {
            this.loadCategories();
            Swal.fire({
              title: this.translate.instant('CATEGORIES.DELETE_SUCCESS_TITLE'),
              text: this.translate.instant('CATEGORIES.DELETE_SUCCESS_TEXT'),
              icon: 'success',
              timer: 1500,
              showConfirmButton: false,
              background: '#1e293b',
              color: '#fff'
            });
          },
          error: (err: any) => {
            console.error(err);
            Swal.fire({
              title: this.translate.instant('CATEGORIES.DELETE_ERROR_TITLE'),
              text: this.translate.instant('CATEGORIES.DELETE_ERROR_TEXT'),
              icon: 'error',
              background: '#1e293b',
              color: '#fff'
            });
          }
        });
      }
    });
  }
}
