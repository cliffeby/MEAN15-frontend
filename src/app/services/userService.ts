import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';
import { User } from '../models/users';

// export interface User {
//   _id?: string;
//   name?: string;
//   email?: string;
//   role?: string;
//   defaultLeague?: string;
// }

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = 'http://localhost:5001/api/users';

  private getHeaders() {
    const token = this.auth.token();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  getAll(): Observable<any> {
    return this.http.get(this.baseUrl, this.getHeaders());
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`, this.getHeaders());
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHeaders());
  }

  updateLeague(id: string, defaultLeague: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/league`, { defaultLeague }, this.getHeaders());
  }
}
