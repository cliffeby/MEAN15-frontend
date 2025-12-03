import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/authService';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = Array.isArray(route.data['role'])
    ? route.data['role']
    : [route.data['role']];
  const token = authService.token();

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const payload = authService.payload();
  if (!payload || !expectedRoles.includes(payload.role)) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
