import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './authService';
import { environment } from '../../environments/environment';

export interface EmailStatus {
  success: boolean;
  configured: boolean;
  hasConnectionString: boolean;
  hasSenderAddress: boolean;
  senderAddress: string;
}

export interface SendEmailRequest {
  memberIds: string[];
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  personalize?: boolean;
}

export interface SendAllEmailRequest {
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  personalize?: boolean;
  includeHidden?: boolean;
}

export interface TestEmailRequest {
  testEmail?: string;
}

export interface EmailResponse {
  success: boolean;
  message?: string;
  messageId?: string;
  status?: string;
  recipientCount?: number;
  invalidEmails?: number;
  total?: number;
  successful?: number;
  failed?: number;
  errors?: Array<{ email: string; error: string }>;
}

@Injectable({ providedIn: 'root' })
export class EmailService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/email`;

  private getHeaders() {
    const token = this.auth.token();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('EmailService error:', error);
    
    let errorMsg = 'An unexpected error occurred while sending email.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      errorMsg = error.error?.message || `Server error (${error.status}): ${error.message}`;
    }
    return throwError(() => new Error(errorMsg));
  }

  /**
   * Check if email service is configured and get status
   */
  getStatus(): Observable<EmailStatus> {
    return this.http
      .get<EmailStatus>(`${this.baseUrl}/status`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  /**
   * Send test email
   */
  sendTestEmail(testEmail?: string): Observable<EmailResponse> {
    const body: TestEmailRequest = testEmail ? { testEmail } : {};
    return this.http
      .post<EmailResponse>(`${this.baseUrl}/test`, body, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  /**
   * Send email to specific members
   */
  sendToMembers(request: SendEmailRequest): Observable<EmailResponse> {
    return this.http
      .post<EmailResponse>(`${this.baseUrl}/send`, request, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  /**
   * Send email to all members
   */
  sendToAllMembers(request: SendAllEmailRequest): Observable<EmailResponse> {
    return this.http
      .post<EmailResponse>(`${this.baseUrl}/send-all`, request, this.getHeaders())
      .pipe(catchError(this.handleError));
  }
}
