import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class Contact {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5001/api/contact';

  sendMessage(message: ContactMessage): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.baseUrl, message).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error sending message:', error);
  
        let errorMsg = 'Something went wrong while sending your message. Please try again later.';
  
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMsg = `Client error: ${error.error.message}`;
        } else {
          // Server-side error
          errorMsg = `Server error (${error.status}): ${error.message}`;
        }
  
        return throwError(() => new Error(errorMsg));
      })
    );
  }
  
}
