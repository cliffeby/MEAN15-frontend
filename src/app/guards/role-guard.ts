import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

export const roleGuard: CanActivateFn = (route, state) => {
  const msalService = inject(MsalService);
  const router = inject(Router);
  
  const expectedRoles = Array.isArray(route.data['role'])
    ? route.data['role']
    : [route.data['role']];

  const accounts = msalService.instance.getAllAccounts();
  
  if (accounts.length === 0) {
    router.navigate(['/login']);
    return false;
  }

  // Get the active account
  const account = accounts[0];
  
  // Extract roles from token claims
  // Roles can be in 'roles' claim (app roles) or 'extension_Roles' for custom attributes
  const idTokenClaims = account.idTokenClaims as any;
  const userRoles = idTokenClaims?.roles || idTokenClaims?.extension_Roles || [];
  
  // Check if user has any of the expected roles
  const hasRole = expectedRoles.some((role: string) => userRoles.includes(role));
  
  if (!hasRole) {
    console.warn('Access denied. User roles:', userRoles, 'Expected roles:', expectedRoles);
    router.navigate(['/']);
    return false;
  }

  return true;
};
