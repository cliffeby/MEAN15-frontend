import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import jwt_decode from 'jwt-decode';
import { environment } from '../../environments/environment';
import { MsalService } from '@azure/msal-angular'; 

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  token = signal<string | null>(null);
  private baseUrl = `${environment.apiUrl}/auth`;
  private msalService = inject(MsalService);

  constructor(private http: HttpClient) {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      this.token.set(savedToken);
    }
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string }>(`${this.baseUrl}/login`, { email, password })
      .pipe(
        tap(res => {
          this.token.set(res.token);

          // Save token to localStorage
          localStorage.setItem('authToken', res.token);
        }),
        catchError(err => {
          console.error('Login error:', err);
          console.log('Error details:', email, err.error);

          // You can customize error messages here based on backend response
          let errorMsg = 'An error occurred during login. Please try again.';

          if (err.error?.message) {
            errorMsg = err.error.message; // e.g., "Invalid credentials"
          }

          // Optionally clear any stale tokens
          localStorage.removeItem('authToken');
          this.token.set(null);

          return throwError(() => new Error(errorMsg));
        })
      );
  }

  register(userData: any) {
    return this.http.post<{ token: string }>(`${this.baseUrl}/register`, userData)
      .pipe(
        tap(res => {
          if (res && res.token) {
            this.token.set(res.token);
          }
        }),
        catchError(error => {
          let errorMsg = 'An unknown error occurred. Please try again.';

          if (error.error?.message) {
            errorMsg = error.error.message; // backend error message
          } else if (error.status === 0) {
            errorMsg = 'Unable to connect to the server. Please check your internet or backend service.';
          } else if (error.status === 400) {
            errorMsg = 'Invalid input. Please check your details and try again.';
          } else if (error.status === 409) {
            errorMsg = 'User already exists. Try logging in instead.';
          }

          console.error('Register error:', error); // For debugging
          return throwError(() => new Error(errorMsg));
        })
      );
  }

  logout() {
    this.token.set(null);
    this.token.set('');
    localStorage.removeItem('authToken');
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

  get user(): any {
    const payload = this.payload();
    if (!payload) return null;
    // If defaultLeague is present in JWT, expose it
    return {
      ...payload,
      defaultLeague: payload.defaultLeague || undefined
    };
  }

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
    console.log('JWT ID Token:', account.idToken);
    console.log('JWT Token Claims:', account.idTokenClaims);
    
    const idTokenClaims = account.idTokenClaims as any;
    const roles = idTokenClaims?.roles || idTokenClaims?.extension_Roles || [];
    console.log('Extracted roles:', roles);
    
    this.roles.set(roles);
    return roles;
  }

  updateRoles(): void {
    this.getRoles();
  }

  public getMsalService() {
    return this.msalService;
  }
}
