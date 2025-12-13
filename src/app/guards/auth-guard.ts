import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

export const AuthGuard: CanActivateFn = (_route, _state) => {
  const msalService = inject(MsalService);
  const router = inject(Router);

  const accounts = msalService.instance.getAllAccounts();
  
  if (accounts.length > 0) {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};