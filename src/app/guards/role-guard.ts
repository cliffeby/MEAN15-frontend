import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/authService';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRole = route.data['role'] as 'admin' | 'customer';
  const token = authService.token();

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const payload = authService.payload();
  if (!payload || payload.role !== expectedRole) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
