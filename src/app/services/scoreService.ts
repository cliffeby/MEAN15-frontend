import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';
import { Score } from '../models/score';

@Injectable({ providedIn: 'root' })
export class ScoreService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = 'http://localhost:5001/api/scores';

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

  create(score: Score): Observable<any> {
    return this.http.post(this.baseUrl, score, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getAll(): Observable<any> {
    return this.http.get(this.baseUrl, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  update(id: string, score: Score): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, score, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  // Additional methods specific to scores
  getScoresByMember(memberId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/member/${memberId}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getScoresByScorecard(scorecardId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/scorecard/${scorecardId}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }
}