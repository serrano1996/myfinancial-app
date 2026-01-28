import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { filter, map, take, tap } from 'rxjs';
import { Session } from '@supabase/supabase-js';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('AuthGuard: Checking session...');
  return authService.session$.pipe(
    tap((session: Session | null | undefined) => console.log('AuthGuard: Session state:', session)),
    filter((session) => session !== undefined),
    take(1),
    map(session => {
      console.log('AuthGuard: Session resolved:', session ? 'Authenticated' : 'Not Authenticated');
      if (session) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
