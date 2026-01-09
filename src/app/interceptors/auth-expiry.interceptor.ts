import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/authService';
import { Router } from '@angular/router';

@Injectable()
export class AuthExpiryInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err && (err.status === 401 || err.status === 403)) {
          // Token expired or unauthorized — ensure user is logged out and returned to login
          try {
            this.auth.logout();
          } catch (e) {
            console.warn('Error during logout in AuthExpiryInterceptor', e);
          }
          try {
            this.router.navigate(['/']);
          } catch (e) {
            console.warn('Navigation to login failed after token expiry', e);
          }
        }
        return throwError(() => err);
      })
    );
  }
}
