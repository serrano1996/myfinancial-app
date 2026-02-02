import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Tables, TablesInsert, TablesUpdate } from '../../types/supabase';
import { from, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {

  constructor(private supabaseService: SupabaseService) { }

  getTransactions(
    userId: string,
    page = 0,
    pageSize = 20,
    filters?: {
      accountId?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Observable<{ data: Tables<'transactions'>[], count: number }> {
    let query = this.supabaseService.supabase
      .from('transactions')
      .select('id, date, amount, description, type, notes, category_id, account_id, accounts(name), categories(name, type, icon, color)', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const from_ = page * pageSize;
    const to = from_ + pageSize - 1;

    return from(query.range(from_, to)).pipe(
      map(response => ({
        data: (response.data || []) as any[],
        count: response.count || 0
      }))
    );
  }

  createTransaction(transaction: TablesInsert<'transactions'>) {
    return from(
      this.supabaseService.supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single()
    );
  }

  updateTransaction(id: string, transaction: TablesUpdate<'transactions'>) {
    return from(
      this.supabaseService.supabase
        .from('transactions')
        .update(transaction)
        .eq('id', id)
        .select()
        .single()
    );
  }

  deleteTransaction(id: string) {
    return from(
      this.supabaseService.supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id)
    );
  }
}
