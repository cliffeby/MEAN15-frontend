import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const expectedRole = route.data['role'] as 'admin' | 'customer';
  const token = auth.token();

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const payload = auth.payload();
  if (!payload || payload.role !== expectedRole) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
