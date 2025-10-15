import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from './auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Customer {
  private http = inject(HttpClient);
  private authService = inject(Auth);
  private baseUrl = 'http://localhost:5001/api/customers';

  private getHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.authService.token()}` }) };
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
