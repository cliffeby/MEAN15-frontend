import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap, retryWhen, delay, take } from 'rxjs/operators';
import { AuthService } from './authService';
import { ApiService } from './apiService';
import { Match } from '../models/match';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MatchService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private baseUrl = `${environment.apiUrl}/matches`;

  // Cache for matches data
  private matchesCache$: Observable<any> | null = null;
  private matchCache = new Map<string, Observable<any>>();
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  private clearCache(): void {
    this.matchesCache$ = null;
    this.matchCache.clear();
    this.cacheTimestamp = 0;
  }

  private getHeaders() {
    const token = this.auth.token();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('MatchService error:', error);

    // For 409 conflicts, preserve the original error structure
    if (error.status === 409) {
      return throwError(() => error);
    }

    // Handle rate limiting specifically
    if (error.status === 429) {
      console.warn('Rate limited - too many requests to matches API');
      return throwError(() => new Error('Too many requests. Please wait a moment and try again.'));
    }

    let errorMsg = 'An unexpected error occurred. Please try again later.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      errorMsg = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }
    return throwError(() => new Error(errorMsg));
  }

  create(match: Match): Observable<any> {
    this.clearCache(); // Clear cache when creating new match
    return this.http
      .post(this.baseUrl, match, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getAll(): Observable<any> {
    // Check if cache is valid
    const now = Date.now();
    if (this.matchesCache$ && now - this.cacheTimestamp < this.CACHE_DURATION) {
      console.log('Returning cached matches');
      return this.matchesCache$;
    }

    console.log('Fetching matches from API');
    this.matchesCache$ = this.http.get(this.baseUrl, this.getHeaders()).pipe(
      retryWhen((errors) =>
        errors.pipe(
          delay(2000), // Wait 2 seconds before retry for rate limiting
          take(2) // Only retry twice
        )
      ),
      tap(() => (this.cacheTimestamp = now)),
      shareReplay(1),
      catchError((error) => {
        this.clearCache(); // Clear cache on error
        return this.handleError(error);
      })
    );

    return this.matchesCache$;
  }

  getById(id: string): Observable<any> {
    // Check individual match cache
    if (this.matchCache.has(id)) {
      console.log(`Returning cached match for ID: ${id}`);
      return this.matchCache.get(id)!;
    }

    console.log(`Fetching match from API for ID: ${id}`);
    const match$ = this.http.get(`${this.baseUrl}/${id}`, this.getHeaders()).pipe(
      retryWhen((errors) =>
        errors.pipe(
          delay(2000), // Wait 2 seconds before retry for rate limiting
          take(2) // Only retry twice
        )
      ),
      shareReplay(1),
      catchError((error) => {
        this.matchCache.delete(id); // Remove from cache on error
        return this.handleError(error);
      })
    );

    this.matchCache.set(id, match$);
    return match$;
  }

  update(id: string, match: Partial<Match>): Observable<any> {
    this.clearCache(); // Clear cache when updating
    return this.http
      .put(`${this.baseUrl}/${id}`, match, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  delete(params: { id: string; name?: string; authorName?: string }): Observable<any> {
    if (!params?.id) throw new Error('Must provide id');
    const url = `${this.baseUrl}/${params.id}`;
    return this.api.deleteResource(url, { name: params.name, authorName: params.authorName }).pipe(
      tap(() => this.clearCache()), // Clear cache when deleting
      catchError(this.handleError)
    );
  }

  deleteWithAction(
    params: { id: string; name?: string; authorName?: string },
    action: 'nullify' | 'delete'
  ): Observable<any> {
    if (!params?.id) throw new Error('Must provide id');
    const url = `${this.baseUrl}/${params.id}`;
    return this.api.deleteResourceWithAction(url, action, { name: params.name, authorName: params.authorName }).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError)
    );
  }

  getMatchesByUser(userId: string): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/user/${userId}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getMembersInMatch(matchId: string): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/${matchId}/members`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getMatchesByStatus(status: string): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/status/${status}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  updateMatchStatus(id: string, status: string, name?: string, author?: any): Observable<any> {
    this.clearCache(); // Clear cache so match list reloads with updated status
    const body: any = { status };
    if (name) body.name = name;
    if (author) body.author = author;
    return this.http
      .patch(`${this.baseUrl}/${id}/status`, body, this.getHeaders())
      .pipe(catchError(this.handleError));
  }
}
