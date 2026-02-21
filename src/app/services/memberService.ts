import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { AuthService } from './authService';
import { ApiService } from './apiService';
import { Member } from '../models/member';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private baseUrl = `${environment.apiUrl}/members`;

  // Cache for members data
  private membersCache$: Observable<Member[]> | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private clearCache(): void {
    this.membersCache$ = null;
    this.cacheTimestamp = 0;
  }

  private getHeaders() {
    const token = this.auth.token();
    // console.log('DEBUG MemberService token:', token);
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('MemberService error:', error);
    // For 409 conflicts, preserve the original error structure
    if (error.status === 409) {
      return throwError(() => error);
    }

    let errorMsg = 'An unexpected error occurred. Please try again later.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      errorMsg = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }
    return throwError(() => new Error(errorMsg));
  }

  resetBounceStatus(id: string): Observable<Member> {
    this.clearCache();
    return this.http.patch<{ success: boolean; member: Member }>(
      `${this.baseUrl}/${id}/reset-bounce`, {}, this.getHeaders()
    ).pipe(map(r => r.member), catchError(this.handleError));
  }

  create(member: Member): Observable<Member> {
    const author = this.auth.getAuthorObject();
    const memberWithAuthor = { ...member, author };
    return this.http
      .post<{ success: boolean; memberWithAuthor: Member }>(
        this.baseUrl,
        memberWithAuthor,
        this.getHeaders()
      )
      .pipe(
        map((response) => response.memberWithAuthor), // Extract the member from the response
        tap(() => this.clearCache()), // Clear cache after creating
        catchError(this.handleError)
      );
  }

  getAll(): Observable<Member[]> {
    const now = Date.now();

    // Return cached data if it's still valid
    if (this.membersCache$ && now - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.membersCache$;
    }

    // Make fresh request and cache it
    this.membersCache$ = this.http
      .get<{ success: boolean; count: number; members: Member[] }>(this.baseUrl, this.getHeaders())
      .pipe(
        map((response) => response.members),
        tap(() => (this.cacheTimestamp = now)), // Update cache timestamp
        shareReplay(1), // Share the result with multiple subscribers
        catchError(this.handleError)
      );

    return this.membersCache$;
  }

  getAllMembersWithRecentPlayAndHCap(): Observable<any[]> {
    return this.getAll().pipe(
      map((members: Member[]) => {
        return members.map((m: Member) => {
          // Use lastDatePlayed from member for most recent date
          const recentDate: string | null = m.lastDatePlayed ?? null;
          // Use handicap as the best source for newHCap
          return {
            firstName: m.firstName,
            lastName: m.lastName,
            handicap: typeof m.handicap === 'number' ? m.handicap : null,
            usgaIndex: typeof m.usgaIndex === 'number' ? m.usgaIndex : null,
            recentDateOfPlay: recentDate,
          };
        });
      })
    );
  }

  getById(id: string): Observable<Member> {
    return this.http
      .get<{ success: boolean; member: Member }>(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(
        map((response) => response.member), // Extract the member from the response
        catchError(this.handleError)
      );
  }

  update(id: string, member: Member): Observable<Member> {
    const author = this.auth.getAuthorObject();
    const memberWithAuthor = { ...member, author };
    return this.http
      .put<{ success: boolean; memberWithAuthor: Member }>(`${this.baseUrl}/${id}`, memberWithAuthor, this.getHeaders())
      .pipe(
        map((response) => response.memberWithAuthor), // Extract the member from the response
        tap(() => this.clearCache()), // Clear cache after updating
        catchError(this.handleError)
      );
  }

  delete(params: { id: string; name?: string; authorName?: string }): Observable<any> {
    if (!params.id) {
      throw new Error('Must provide id');
    }
    const url = `${this.baseUrl}/${params.id}`;
    return this.api.deleteResource(url, { name: params.name, authorName: params.authorName }).pipe(
      tap(() => this.clearCache()), // Clear cache after deleting
      catchError(this.handleError)
    );
  }

  deleteWithAction(id: string, action: 'nullify' | 'delete'): Observable<any> {
    const url = `${this.baseUrl}/${id}`;
    return this.api.deleteResourceWithAction(url, action).pipe(
      tap(() => this.clearCache()), // Clear cache after deleting
      catchError(this.handleError)
    );
  }

  removeDuplicateEmails(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/duplicates/remove`, this.getHeaders()).pipe(
      tap(() => this.clearCache()), // Clear cache after removing duplicates
      catchError(this.handleError)
    );
  }
}
