import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Tables, TablesInsert, TablesUpdate } from '../../types/supabase';
import { from, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {

  constructor(private supabaseService: SupabaseService) { }

  getCategories(userId: string): Observable<Tables<'categories'>[]> {
    return from(
      this.supabaseService.supabase
        .from('categories')
        .select('id, name, icon, color, type, parent_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('name')
    ).pipe(
      map(response => (response.data || []) as any[])
    );
  }

  createCategory(category: TablesInsert<'categories'>) {
    return from(
      this.supabaseService.supabase
        .from('categories')
        .insert(category)
        .select()
        .single()
    );
  }

  updateCategory(id: string, category: TablesUpdate<'categories'>) {
    return from(
      this.supabaseService.supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .select()
        .single()
    );
  }

  deleteCategory(id: string) {
    return from(
      this.supabaseService.supabase
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
    );
  }
}
