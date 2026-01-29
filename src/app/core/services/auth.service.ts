import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthSession, User, Provider, Session, UserAttributes } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _session = new BehaviorSubject<Session | null | undefined>(undefined);
  private _user = new BehaviorSubject<User | null>(null);

  constructor(private supabaseService: SupabaseService) {
    this.loadSession();
    this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
      // Check for 24-hour explicit expiry
      if (session) {
        const lastSignIn = new Date(session.user.last_sign_in_at || session.access_token.split('.')[1] ? 0 : Date.now()).getTime(); // Fallback if needed, but last_sign_in_at should be there
        // Actually, simpler usage: check issued_at (iat) or similar, but let's use last_sign_in_at if available
        // Better approach: check local timestamp if stored, or just rely on session.expires_at (which is token expiry)
        // For "1 day max login session", we need to check if the session started > 24h ago.

        // Supabase sessions refresh, so expires_at moves forward.
        // We will check user.last_sign_in_at.
        const signInTime = new Date(session.user.last_sign_in_at ?? '').getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const now = Date.now();

        if (signInTime && (now - signInTime > oneDayMs)) {
          console.log('Session expired (24h limit). Logging out.');
          this.signOut();
          return;
        }
      }

      this._session.next(session);
      this._user.next(session?.user ?? null);
    });
  }

  get session$(): Observable<Session | null | undefined> {
    return this._session.asObservable();
  }

  get user$(): Observable<User | null> {
    return this._user.asObservable();
  }

  async loadSession() {
    // Fallback safety: If onAuthStateChange doesn't fire in 2s, assume no session
    setTimeout(() => {
      if (this._session.value === undefined) {
        this._session.next(null);
        this._user.next(null);
      }
    }, 2000);
  }

  async signUp(email: string, password: string, data?: any) {
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

  async updateUser(attributes: UserAttributes) {
    const { data, error } = await this.supabaseService.supabase.auth.updateUser(attributes);
    if (error) throw error;
    if (data.user) {
      this._user.next(data.user);
    }
    return data;
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await this.supabaseService.supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = this.supabaseService.supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  get currentUser() {
    return this._user.value;
  }
}
