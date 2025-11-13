import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';
import { Match } from '../models/match';

@Injectable({ providedIn: 'root' })
export class MatchService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = 'http://localhost:5001/api/matches';

  private getHeaders() {
    const token = this.auth.token();
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('MatchService error:', error);
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

  create(match: Match): Observable<any> {
    return this.http.post(this.baseUrl, match, this.getHeaders())
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

  update(id: string, match: Match): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, match, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  deleteWithAction(id: string, action: 'nullify' | 'delete'): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      ...this.getHeaders(),
      body: { force: true, action }
    }).pipe(catchError(this.handleError));
  }

  // Additional methods specific to matches
  getMatchesByUser(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getMatchesByStatus(status: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/status/${status}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  updateMatchStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, { status }, this.getHeaders())
      .pipe(catchError(this.handleError));
  }
}