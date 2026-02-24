import { AuthExpiryInterceptor } from './auth-expiry.interceptor';
import { AuthService } from '../services/authService';
import { Router } from '@angular/router';
import { HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { fakeAsync, tick } from '@angular/core/testing';

describe('AuthExpiryInterceptor', () => {
  let interceptor: AuthExpiryInterceptor;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', ['logout']); // Mock AuthService
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    interceptor = new AuthExpiryInterceptor(routerSpy as any, authSpy as any); // Inject AuthService
  });

  function handlerWithStatus(status: number): HttpHandler {
    return ({
      handle: () => throwError(() => new HttpErrorResponse({ status }))
    } as unknown) as HttpHandler;
  }

  afterEach(() => {
    authSpy.logout.calls.reset();
    routerSpy.navigate.calls.reset();
  });

  it('should call logout and navigate on 401', fakeAsync(() => {
    const req = new HttpRequest('GET', '/test');
    const next = handlerWithStatus(401);

    interceptor.intercept(req, next).subscribe({
      next: () => fail('expected error'),
      error: (err: HttpErrorResponse) => {
        expect(authSpy.logout).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
        expect(err.status).toBe(401);
      }
    });
    tick(10); // allow async code to run
  }));

  it('should call logout and navigate on 403', fakeAsync(() => {
    const req = new HttpRequest('GET', '/test');
    const next = handlerWithStatus(403);

    interceptor.intercept(req, next).subscribe({
      next: () => fail('expected error'),
      error: (err: HttpErrorResponse) => {
        expect(authSpy.logout).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
        expect(err.status).toBe(403);
      }
    });
    tick(10);
  }));

  it('should NOT call logout or navigate for other errors', fakeAsync(() => {
    const req = new HttpRequest('GET', '/test');
    const next = handlerWithStatus(500);

    interceptor.intercept(req, next).subscribe({
      next: () => fail('expected error'),
      error: (err: HttpErrorResponse) => {
        expect(authSpy.logout).not.toHaveBeenCalled();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
        expect(err.status).toBe(500);
      }
    });
    tick(10);
  }));
});
