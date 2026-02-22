import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/authService';

export const roleGuard: CanActivateFn = (route, _state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const expectedRoles: string[] = Array.isArray(route.data['role'])
    ? route.data['role']
    : [route.data['role']];

  if (!auth.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  const userRoles = auth.getRoles();
  const hasRole = expectedRoles.some((r) => auth.hasMinRole(r));

  if (!hasRole) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
