import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/authService';

@Injectable()
export class AuthExpiryInterceptor implements HttpInterceptor {
  private static handlingExpiry = false;

  constructor(private router: Router, private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if ((err.status === 401 || err.status === 403) && !AuthExpiryInterceptor.handlingExpiry) {
          AuthExpiryInterceptor.handlingExpiry = true;
          localStorage.removeItem('authToken');
          this.authService.logout(); // Call AuthService.logout
          this.router.navigate(['/']);
          setTimeout(() => (AuthExpiryInterceptor.handlingExpiry = false), 5000);
        }
        return throwError(() => err);
      })
    );
  }
}
