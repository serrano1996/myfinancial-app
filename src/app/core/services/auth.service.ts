import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthSession, User, Provider, Session } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _session = new BehaviorSubject<Session | null>(null);
  private _user = new BehaviorSubject<User | null>(null);

  constructor(private supabaseService: SupabaseService) {
    this.loadSession();
    this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
      this._session.next(session);
      this._user.next(session?.user ?? null);

      // Auto-create profile if needed is handled by DB trigger,
      // but we might want to fetch profile here.
    });
  }

  get session$(): Observable<Session | null> {
    return this._session.asObservable();
  }

  get user$(): Observable<User | null> {
    return this._user.asObservable();
  }

  async loadSession() {
    const { data } = await this.supabaseService.supabase.auth.getSession();
    this._session.next(data.session);
    this._user.next(data.session?.user ?? null);
  }

  async signUp(email: string, password: string, data?: { full_name: string }) {
    return this.supabaseService.supabase.auth.signUp({
      email,
      password,
      options: {
        data
      }
    });
  }

  async signIn(email: string, password: string) {
    return this.supabaseService.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signOut() {
    return this.supabaseService.supabase.auth.signOut();
  }

  get currentUser() {
    return this._user.value;
  }
}
