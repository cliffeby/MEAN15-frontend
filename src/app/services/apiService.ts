import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './authService';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private getHeaders(): { headers?: HttpHeaders } {
    const token = this.auth.token();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  private buildUrlWithParams(url: string, params?: Record<string, any>): string {
    if (!params) return url;
    const parts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length ? `${url}?${parts.join('&')}` : url;
  }

  /** Simple DELETE with optional query params */
  delete<T = any>(url: string, params?: Record<string, any>): Observable<T> {
    const fullUrl = this.buildUrlWithParams(url, params);
    return this.http.delete<T>(fullUrl, this.getHeaders());
  }

  /**
   * Domain-aware helper: delete a resource using domain param names (keeps caller concise).
   * Maps `authorName` -> `author` and forwards to `delete`.
   */
  deleteResource<T = any>(url: string, params?: { name?: string; authorName?: string }): Observable<T> {
    const mapped: Record<string, any> = {};
    if (params?.name) mapped['name'] = params.name;
    if (params?.authorName) mapped['author'] = params.authorName;
    return this.delete<T>(url, mapped);
  }

  /**
   * Delete with explicit action passed as query param (avoids DELETE request body).
   * Example: api.deleteWithAction('/api/matches/123', 'delete', { force: true })
   */
  deleteWithAction<T = any>(url: string, action: 'nullify' | 'delete', extraParams?: Record<string, any>): Observable<T> {
    const params = { ...(extraParams || {}), action };
    const fullUrl = this.buildUrlWithParams(url, params);
    return this.http.delete<T>(fullUrl, this.getHeaders());
  }

  /**
   * Domain-aware helper for delete-with-action.
   * Adds `force: true` and maps `authorName` -> `author` before calling `deleteWithAction`.
   */
  deleteResourceWithAction<T = any>(url: string, action: 'nullify' | 'delete', params?: { name?: string; authorName?: string } | undefined): Observable<T> {
    const extra: Record<string, any> = { force: true };
    if (params?.name) extra['name'] = params.name;
    if (params?.authorName) extra['author'] = params.authorName;
    return this.deleteWithAction<T>(url, action, extra);
  }
}
