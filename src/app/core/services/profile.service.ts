import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Tables, TablesUpdate } from '../../types/supabase';
import { from, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  constructor(private supabaseService: SupabaseService) { }

  getProfile(userId: string): Observable<Tables<'profiles'> | null> {
    return from(
      this.supabaseService.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    ).pipe(
      map(response => response.data)
    );
  }

  updateProfile(userId: string, profile: TablesUpdate<'profiles'>) {
    return from(
      this.supabaseService.supabase
        .from('profiles')
        .update(profile)
        .eq('id', userId)
    );
  }
}
