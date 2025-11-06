import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';

export interface Customer {
  // ... existing interface
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = 'http://localhost:5001/api/customers';

  private getHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token()}` }) };
  }

  getAll(): Observable<any> {
    return this.http.get(this.baseUrl, this.getHeaders());
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`, this.getHeaders());
  }

  create(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data, this.getHeaders());
  }

  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data, this.getHeaders());
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHeaders()); 
  }
}
