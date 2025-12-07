import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { AuthService } from './authService';
import { HCap } from '../models/hcap';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HCapService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/hcaps`;

  private cache$: Observable<any> | null = null;
  private cacheTs = 0;
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  private clearCache() {
    this.cache$ = null;
    this.cacheTs = 0;
  }

  private getHeaders() {
    const token = this.auth.token();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('HCapService error:', error);
    let message = 'An unexpected error occurred';
    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      message = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }
    return throwError(() => new Error(message));
  }

  create(hcap: Partial<HCap>): Observable<any> {
    return this.http.post(this.baseUrl, hcap, this.getHeaders()).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError)
    );
  }

  getAll(): Observable<any> {
    const now = Date.now();
    if (this.cache$ && now - this.cacheTs < this.CACHE_TTL) return this.cache$;
    this.cache$ = this.http.get(this.baseUrl, this.getHeaders()).pipe(
      tap(() => (this.cacheTs = Date.now())),
      shareReplay(1),
      catchError(this.handleError)
    );
    return this.cache$;
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`, this.getHeaders()).pipe(catchError(this.handleError));
  }

  update(id: string, hcap: Partial<HCap>): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, hcap, this.getHeaders()).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError)
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHeaders()).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError)
    );
  }
}
