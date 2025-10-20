import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import jwt_decode from 'jwt-decode';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  token = signal<string | null>(null);

  constructor(private http: HttpClient) {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      this.token.set(savedToken);
    }
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string }>('http://localhost:5001/api/auth/login', { email, password })
      .pipe(
        tap(res => {
          this.token.set(res.token);
  
          // Save token to localStorage
          localStorage.setItem('authToken', res.token);
        }),
        catchError(err => {
          console.error('Login error:', err);
          console.log('Error details:', email, err.error);
  
          // You can customize error messages here based on backend response
          let errorMsg = 'An error occurred during login. Please try again.';
  
          if (err.error?.message) {
            errorMsg = err.error.message; // e.g., "Invalid credentials"
          }
  
          // Optionally clear any stale tokens
          localStorage.removeItem('authToken');
          this.token.set(null);
  
          return throwError(() => new Error(errorMsg));
        })
      );
  }

register(userData: any) {
  return this.http.post<{ token: string }>('http://localhost:5001/api/auth/register', userData)
    .pipe(
      tap(res => {
        if (res && res.token) {
          this.token.set(res.token);
        }
      }),
      catchError(error => {
        let errorMsg = 'An unknown error occurred. Please try again.';
        
        if (error.error?.message) {
          errorMsg = error.error.message; // backend error message
        } else if (error.status === 0) {
          errorMsg = 'Unable to connect to the server. Please check your internet or backend service.';
        } else if (error.status === 400) {
          errorMsg = 'Invalid input. Please check your details and try again.';
        } else if (error.status === 409) {
          errorMsg = 'User already exists. Try logging in instead.';
        }
        
        console.error('Register error:', error); // For debugging
        return throwError(() => new Error(errorMsg));
      })
    );
}

  logout() {
    this.token.set(null);
    this.token.set('');
    localStorage.removeItem('authToken');
  }

  isLoggedIn() {
    return !!this.token();
  }

  // Decode JWT payload
  payload(): any {
    if (!this.token()) return null;
    try {
      return jwt_decode(this.token()!);
    } catch {
      return null;
    }
  }

  get user(): any {
    return this.payload();
  }
  
  get role(): string | null {
    if (!this.token()) return null;
    const payload: any = jwt_decode(this.token()!);
    return payload.role || null;
  }
}
