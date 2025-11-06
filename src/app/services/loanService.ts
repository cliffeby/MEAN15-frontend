import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';

export interface Loan {
  // ... existing interface
}

@Injectable({ providedIn: 'root' })
export class LoanService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = 'http://localhost:5001/api/loans';

  private getHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token()}` }) };
  }

  private handleError(error: HttpErrorResponse) {
    console.error('LoanService error:', error);

    let errorMsg = 'An unexpected error occurred. Please try again later.';

    if (error.error instanceof ErrorEvent) {
      // Client-side / network error
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      // Backend error
      errorMsg = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }

    return throwError(() => new Error(errorMsg));
  }

  getAll(): Observable<any> {
    return this.http.get(this.baseUrl, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getMyLoans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/my`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  create(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, { status }, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }
}
