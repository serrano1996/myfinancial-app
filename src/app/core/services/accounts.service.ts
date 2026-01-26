import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Tables, TablesInsert, TablesUpdate } from '../../types/supabase';
import { from, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {

  constructor(private supabaseService: SupabaseService) { }

  getAccounts(userId: string): Observable<Tables<'accounts'>[]> {
    return from(
      this.supabaseService.supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('name')
    ).pipe(
      map(response => response.data || [])
    );
  }

  createAccount(account: TablesInsert<'accounts'>) {
    return from(
      this.supabaseService.supabase
        .from('accounts')
        .insert(account)
        .select()
        .single()
    );
  }

  updateAccount(id: string, account: TablesUpdate<'accounts'>) {
    return from(
      this.supabaseService.supabase
        .from('accounts')
        .update(account)
        .eq('id', id)
        .select()
        .single()
    );
  }

  deleteAccount(id: string) {
    return from(
      this.supabaseService.supabase
        .from('accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
    );
  }
}
