import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, lastValueFrom } from 'rxjs';
import { catchError, shareReplay, tap, retryWhen, delay, take } from 'rxjs/operators';
import { AuthService } from './authService';
import { Score } from '../models/score';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ScoreService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/scores`;
  
  // Cache for scores data
  private scoresCache$: Observable<any> | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

  private clearCache(): void {
    this.scoresCache$ = null;
    this.cacheTimestamp = 0;
  }

  private getHeaders() {
    const token = this.auth.token();
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('ScoreService error:', error);
    let errorMsg = 'An unexpected error occurred. Please try again later.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      errorMsg = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }
    return throwError(() => new Error(errorMsg));
  }

  create(score: Score, userId?: string): Observable<any> {
    const body = userId ? { ...score, userId } : score;
    return this.http.post(this.baseUrl, body, this.getHeaders())
      .pipe(
        retryWhen(errors => 
          errors.pipe(
            delay(1000), // Wait 1 second before retry
            take(2) // Only retry twice
          )
        ),
        tap(() => this.clearCache()), // Clear cache after creating
        catchError(this.handleError)
      );
  }

  getAll(): Observable<any> {
    const now = Date.now();
    
    // Return cached data if it's still valid
    if (this.scoresCache$ && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.scoresCache$;
    }
    
    // Make fresh request and cache it
    this.scoresCache$ = this.http.get(this.baseUrl, this.getHeaders())
      .pipe(
        tap(() => this.cacheTimestamp = now), // Update cache timestamp
        shareReplay(1), // Share the result with multiple subscribers
        catchError(this.handleError)
      );
    
    return this.scoresCache$;
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  update(id: string, score: Score, userId?: string): Observable<any> {
    const body = userId ? { ...score, userId } : score;
    return this.http.put(`${this.baseUrl}/${id}`, body, this.getHeaders())
      .pipe(
        retryWhen(errors => 
          errors.pipe(
            delay(1000), // Wait 1 second before retry
            take(2) // Only retry twice
          )
        ),
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

  // Additional methods specific to scores
  getScoresByMember(memberId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/member/${memberId}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getScoresByMatch(matchId: string): Observable<{success: boolean; count: number; scores: any[]}> {
    return this.http.get<{success: boolean; count: number; scores: any[]}>(`${this.baseUrl}/match/${matchId}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getScoresByScorecard(scorecardId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/scorecard/${scorecardId}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  savePlayerScore(scoreData: Partial<Score>, existingScoreId?: string): Promise<any> {
    if (existingScoreId) {
      return lastValueFrom(
        this.update(existingScoreId, scoreData as Score).pipe(
          retryWhen(errors => errors.pipe(delay(500), take(2))),
          tap(() => this.clearCache()),
          catchError(this.handleError)
        )
      );
    } else {
      return lastValueFrom(
        this.create(scoreData as Score).pipe(
          retryWhen(errors => errors.pipe(delay(500), take(2))),
          tap(() => this.clearCache()),
          catchError(this.handleError)
        )
      );
    }
  }
}