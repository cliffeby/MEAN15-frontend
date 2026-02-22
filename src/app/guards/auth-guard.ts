import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const AuthGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);
  const token = localStorage.getItem('authToken');
  if (!token) {
    router.navigate(['/']);
    return false;
  }
  // Check expiry from JWT payload
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('authToken');
      router.navigate(['/']);
      return false;
    }
  } catch {
    // malformed token — reject
    localStorage.removeItem('authToken');
    router.navigate(['/']);
    return false;
  }
  return true;
};