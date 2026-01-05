import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';
import { environment } from '../../environments/environment';
import { Scorecard } from '../models/scorecard.interface';

@Injectable({ providedIn: 'root' })
export class ScorecardService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/scorecards`;

  private getHeaders() {
    const token = this.auth.token();
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('ScorecardService error:', error);
    let errorMsg = 'An unexpected error occurred. Please try again later.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      errorMsg = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }
    return throwError(() => new Error(errorMsg));
  }

  create(scorecard: Scorecard): Observable<any> {
    // Ensure author is populated
    const author = this.auth.getAuthorObject();
    const scorecardWithAuthor = { ...scorecard, author };
    return this.http.post(this.baseUrl, scorecardWithAuthor, this.getHeaders())
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

  update(id: string, scorecard: Scorecard): Observable<any> {
    // Ensure author is populated
    const author = this.auth.getAuthorObject();
    const scorecardWithAuthor = { ...scorecard, author };
    return this.http.put(`${this.baseUrl}/${id}`, scorecardWithAuthor, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  /**
   * Deletes a scorecard by id, passing name and authorName as query params if provided.
   * Usage:
   *   delete('123', 'foo', 'bar')
   */
  delete(id: string, name?: string, authorName?: string): Observable<any> {
    if (!id) {
      throw new Error('Must provide id');
    }
    let url = `${this.baseUrl}/${id}`;
    const query: string[] = [];
    if (name) query.push(`name=${encodeURIComponent(name)}`);
    if (authorName) query.push(`author=${encodeURIComponent(authorName)}`);
    if (query.length) {
      url += `?${query.join('&')}`;
    }
    return this.http.delete(url, this.getHeaders())
      .pipe(catchError(this.handleError));
  }
}