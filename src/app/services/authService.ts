import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;

  private readonly ROLE_LEVELS: Record<string, number> = {
    user: 1, fieldhand: 2, admin: 3, developer: 4,
  };

  constructor(private http: HttpClient) {}

  // ---- Token helpers ----

  token(): string | null {
    return localStorage.getItem('authToken');
  }

  isLoggedIn(): boolean {
    const t = this.token();
    if (!t) return false;
    try {
      const p = JSON.parse(atob(t.split('.')[1]));
      return !p.exp || p.exp * 1000 > Date.now();
    } catch { return false; }
  }

  payload(): any {
    const t = this.token();
    if (!t) return null;
    try { return JSON.parse(atob(t.split('.')[1])); } catch { return null; }
  }

  // ---- Role helpers ----

  getRoles(): string[] {
    const p = this.payload();
    if (!p) return [];
    if (p.role) return [p.role];
    if (Array.isArray(p.roles)) return p.roles;
    return [];
  }

  private getRoleLevel(role: string): number {
    return this.ROLE_LEVELS[role] || 0;
  }

  getHighestRole(): string | null {
    const roles = this.getRoles();
    if (!roles.length) return null;
    return roles.reduce((h, r) => this.getRoleLevel(r) > this.getRoleLevel(h) ? r : h, roles[0]);
  }

  hasMinRole(minRole: string): boolean {
    return this.getRoles().some(r => this.getRoleLevel(r) >= this.getRoleLevel(minRole));
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  /** No-op – roles are always read fresh from the JWT payload */
  updateRoles(): void {}

  getAuthorEmail(): string | null {
    const p = this.payload();
    return p?.email || null;
  }

  getAuthorName(): string | null {
    const p = this.payload();
    return p?.name || p?.email || null;
  }

  getAuthorObject(): { id: string; email: string; name: string } {
    const p = this.payload();
    return {
      id: p?.id || '',
      email: p?.email || '',
      name: p?.name || p?.email || '',
    };
  }

  // ---- Auth API calls ----

  register(userData: { name: string; email: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.baseUrl}/register`, userData).pipe(
      catchError((err) => {
        const msg = err.error?.message || (err.status === 409 ? 'Email already exists.' : 'Registration failed.');
        return throwError(() => new Error(msg));
      })
    );
  }

  localLogin(email: string, password: string): Observable<{ success: boolean; token: string; mustChangePassword: boolean; user: any }> {
    return this.http.post<any>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((res) => {
        if (res?.token) localStorage.setItem('authToken', res.token);
      }),
      catchError((err) => throwError(() => new Error(err.error?.message || 'Login failed.')))
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; token: string }> {
    return this.http.put<any>(`${this.baseUrl}/change-password`, { currentPassword, newPassword }).pipe(
      tap((res) => {
        if (res?.token) localStorage.setItem('authToken', res.token);
      }),
      catchError((err) => throwError(() => new Error(err.error?.message || 'Password change failed.')))
    );
  }

  logout(): void {
    localStorage.removeItem('authToken');
  }
}
