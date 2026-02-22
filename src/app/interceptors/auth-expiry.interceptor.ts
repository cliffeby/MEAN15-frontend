import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthExpiryInterceptor implements HttpInterceptor {
  private static handlingExpiry = false;

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !AuthExpiryInterceptor.handlingExpiry) {
          AuthExpiryInterceptor.handlingExpiry = true;
          localStorage.removeItem('authToken');
          this.router.navigate(['/']);
          setTimeout(() => (AuthExpiryInterceptor.handlingExpiry = false), 5000);
        }
        return throwError(() => err);
      })
    );
  }
}
