import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.session$.pipe(
    take(1),
    map(session => {
      if (session) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
