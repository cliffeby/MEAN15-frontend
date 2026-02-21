import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import jwt_decode from 'jwt-decode';
import { environment } from '../../environments/environment';
import { MsalService } from '@azure/msal-angular';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _tokenSignal = signal<string | null>(null);

  /**
   * Returns the current access token from MSAL if available, otherwise from localStorage.
   */
  public token(): string | null {
    // Try to get access token from MSAL
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      // Try to get access token silently
      // NOTE: This is async, but for header use, we need a sync value. So, use idToken as fallback.
      const idToken = accounts[0].idToken;
      if (idToken) {
        return idToken;
      }
    }
    // Fallback to signal/localStorage
    return this._tokenSignal();
  }
  private baseUrl = `${environment.apiUrl}/auth`;
  private msalService = inject(MsalService);

  constructor(private http: HttpClient) {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      this._tokenSignal.set(savedToken);
    }
  }
  // Role hierarchy: admin > editor > user
  private readonly ROLE_LEVELS: Record<string, number> = {
    user: 1,
    fieldhand: 2,
    admin: 3,
    developer: 4,
  };

  private getRoleLevel(role: string): number {
    return this.ROLE_LEVELS[role] || 0;
  }

  /**
   * Returns the highest role of the current user based on hierarchy.
   */
  getHighestRole(): string | null {
    const roles = this.getRoles();
    if (!roles || roles.length === 0) return null;
    return roles.reduce((highest: string, role: string) => {
      return this.getRoleLevel(role) > this.getRoleLevel(highest) ? role : highest;
    }, roles[0]);
  }

  /**
   * Checks if the current user has at least the given minimum role (hierarchy-aware).
   * @param minRole The minimum role required (e.g., 'editor', 'admin')
   */
  hasMinRole(minRole: string): boolean {
    const roles = this.getRoles();
    if (!roles || roles.length === 0) return false;
    const minLevel = this.getRoleLevel(minRole);
    return roles.some((role: string) => this.getRoleLevel(role) >= minLevel);
  }

  /**
   * Checks if the current user has a specific role (no hierarchy).
   * @param role The role to check for (e.g., 'admin')
   */
  hasRole(role: string): boolean {
    const roles = this.getRoles();
    return roles.includes(role);
  }
  // ...existing code...

  register(userData: { name: string; email: string }) {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/register`, userData).pipe(
      catchError((error) => {
        let errorMsg = 'An unknown error occurred. Please try again.';
        if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (error.status === 0) {
          errorMsg = 'Unable to connect to the server. Please check your internet or backend service.';
        } else if (error.status === 409) {
          errorMsg = 'An account with that email already exists.';
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  logout() {
    this._tokenSignal.set(null);
    localStorage.removeItem('authToken');
    try {
      // Ensure MSAL session is cleared as well
      if (this.msalService && this.msalService.instance.getAllAccounts().length > 0) {
        // Use logoutRedirect to clear session and return to app's root
        this.msalService.logoutRedirect();
      }
    } catch (e) {
      console.warn('MSAL logout failed (ignored):', e);
    }
  }

  isLoggedIn() {
    return !!this.token();
  }

  // Decode JWT payload
  payload(): any {
    if (!this.token()) return null;
    try {
      return jwt_decode(this.token()!);
    } catch {
      return null;
    }
  }

  // get user(): any {
  //   const payload = this.payload();
  //   if (!payload) return null;
  //   // If defaultLeague is present in JWT, expose it
  //   return {
  //     ...payload,
  //     defaultLeague: payload.defaultLeague || undefined,
  //   };
  // }

  get role(): string | null {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) return null;

    const idTokenClaims = accounts[0].idTokenClaims as any;
    const roles = idTokenClaims?.roles || idTokenClaims?.extension_Roles || [];

    // Return first role if available
    return roles.length > 0 ? roles[0] : null;
  }

  roles = signal<string[]>([]);

  getRoles(): string[] {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) return [];

    const account = accounts[0];
    // console.log('JWT ID Token:', account.idToken);
    // console.log('JWT Token Claims:', account.idTokenClaims);
    const idTokenClaims = account.idTokenClaims as any;
    const roles = idTokenClaims?.roles || idTokenClaims?.extension_Roles || [];
    // console.log('Extracted roles:', roles);
    return roles;
  }

  updateRoles(): void {
    this.getRoles();
  }

  public getMsalService() {
    return this.msalService;
  }

  /**
   * Calls POST /api/auth/provision to JIT-create a local User record on first login.
   * Safe to call on every app load — the backend is idempotent (returns existing record
   * if the user is already provisioned).
   */
  provision(): Observable<{ success: boolean; provisioned: boolean; user: any }> {
    return this.http
      .post<{ success: boolean; provisioned: boolean; user: any }>(`${this.baseUrl}/provision`, {})
      .pipe(catchError(() => throwError(() => new Error('Provision failed'))));
  }

  /**
   * Local email/password login (non-Entra).
   * Returns a JWT and a mustChangePassword flag.
   */
  localLogin(email: string, password: string): Observable<{ success: boolean; token: string; mustChangePassword: boolean; user: any }> {
    return this.http
      .post<any>(`${this.baseUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res?.token) {
            this._tokenSignal.set(res.token);
            localStorage.setItem('authToken', res.token);
          }
        }),
        catchError((err) => {
          const msg = err.error?.message || 'Login failed. Check your email and password.';
          return throwError(() => new Error(msg));
        })
      );
  }

  /**
   * Changes the local password. Requires the current password for verification.
   * On success the backend issues a fresh token with mustChangePassword=false.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; token: string }> {
    return this.http
      .put<any>(`${this.baseUrl}/change-password`, { currentPassword, newPassword })
      .pipe(
        tap((res) => {
          if (res?.token) {
            this._tokenSignal.set(res.token);
            localStorage.setItem('authToken', res.token);
          }
        }),
        catchError((err) => {
          const msg = err.error?.message || 'Password change failed.';
          return throwError(() => new Error(msg));
        })
      );
  }
  /**
   * Returns the authenticated user's email address from the Entra/MSAL token.
   */
  getAuthorEmail(): string | null {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) return null;
    const idTokenClaims = accounts[0].idTokenClaims as any;
    return idTokenClaims?.email || idTokenClaims?.preferred_username || null;
  }

  /**
   * Returns the authenticated user's display name from the Entra/MSAL token.
   */
  getAuthorName(): string | null {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) return null;
    const idTokenClaims = accounts[0].idTokenClaims as any;
    // Prefer display name, fallback to preferred_username, then email
    return idTokenClaims?.name || idTokenClaims?.preferred_username || idTokenClaims?.email || null;
  }

  /**
   * Returns the complete author object for the authenticated user from Entra/MSAL token.
   * This should be used when creating or updating records that require author information.
   */
  getAuthorObject(): { id: string; email: string; name: string } {
    const email = this.getAuthorEmail() || '';
    const name = this.getAuthorName() || '';
    const id = this.getHighestRole() || email; // Fallback to email if no explicit id

    return {
      id,
      email,
      name,
    };
  }
}
