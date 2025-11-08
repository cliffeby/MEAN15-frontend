import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { AuthService } from './authService';
import { Member } from '../models/member';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = 'http://localhost:5001/api/members';
  
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
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('MemberService error:', error);
    let errorMsg = 'An unexpected error occurred. Please try again later.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      errorMsg = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }
    return throwError(() => new Error(errorMsg));
  }

  create(member: Member): Observable<Member> {
    return this.http.post<{success: boolean, member: Member}>(this.baseUrl, member, this.getHeaders())
      .pipe(
        map(response => response.member), // Extract the member from the response
        tap(() => this.clearCache()), // Clear cache after creating
        catchError(this.handleError)
      );
  }

  getAll(): Observable<Member[]> {
    const now = Date.now();
    
    // Return cached data if it's still valid
    if (this.membersCache$ && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.membersCache$;
    }
    
    // Make fresh request and cache it
    this.membersCache$ = this.http.get<{success: boolean, count: number, members: Member[]}>(this.baseUrl, this.getHeaders())
      .pipe(
        map(response => response.members),
        tap(() => this.cacheTimestamp = now), // Update cache timestamp
        shareReplay(1), // Share the result with multiple subscribers
        catchError(this.handleError)
      );
    
    return this.membersCache$;
  }

  getById(id: string): Observable<Member> {
    return this.http.get<{success: boolean, member: Member}>(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(
        map(response => response.member), // Extract the member from the response
        catchError(this.handleError)
      );
  }

  update(id: string, member: Member): Observable<Member> {
    return this.http.put<{success: boolean, member: Member}>(`${this.baseUrl}/${id}`, member, this.getHeaders())
      .pipe(
        map(response => response.member), // Extract the member from the response
        tap(() => this.clearCache()), // Clear cache after updating
        catchError(this.handleError)
      );
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(
        tap(() => this.clearCache()), // Clear cache after deleting
        catchError(this.handleError)
      );
  }
}
