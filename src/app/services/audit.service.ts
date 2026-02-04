import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/audit/logs`;

  private getHeaders() {
    const token = this.auth.token();
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('AuditService error:', error);
    let errorMsg = 'An unexpected error occurred. Please try again later.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      errorMsg = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }
    return throwError(() => new Error(errorMsg));
  }

  getAuditLogs(params: { page?: number; pageSize?: number; name?: string; dateFrom?: string; dateTo?: string } = {}): Observable<any> {
    const query: any = { ...params };
    // Remove undefined/null
    Object.keys(query).forEach((k) => (query[k] == null || query[k] === '') && delete query[k]);
    return this.http.get(this.baseUrl, { ...this.getHeaders(), params: query })
      .pipe(catchError(this.handleError));
  }
}
