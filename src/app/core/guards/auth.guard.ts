import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { filter, map, take, tap } from 'rxjs';
import { Session } from '@supabase/supabase-js';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.session$.pipe(
    filter(session => session !== undefined), // Wait for session to be undefined (loading) or null/Session
    take(1),
    map(session => {
      const isAuthenticated = !!session;
      if (isAuthenticated) {
        return true;
      } else {
        return router.createUrlTree(['/login']);
      }
    })
  );
};
