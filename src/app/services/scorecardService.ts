import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';
import { environment } from '../../environments/environment';

export interface Scorecard {
  _id?: string;
  groupName?: string;
  name?: string;
  rating?: number;
  slope?: number;
  parInputString?: string;
  pars?: number[];
  par?: number;
  hCapInputString?: string;
  hCaps?: number[];
  yardsInputString?: string;
  yards?: number[];
  scorecardsId?: string[];
  scorecardId?: string;
  user?: string;
  courseTeeName?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

  create(scorecard: Scorecard, userId?: string): Observable<any> {
    const body = userId ? { ...scorecard, userId } : scorecard;
    return this.http.post(this.baseUrl, body, this.getHeaders())
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

  update(id: string, scorecard: Scorecard, userId?: string): Observable<any> {
    const body = userId ? { ...scorecard, userId } : scorecard;
    return this.http.put(`${this.baseUrl}/${id}`, body, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }
}