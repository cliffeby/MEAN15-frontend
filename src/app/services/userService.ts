import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './authService';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/users`;

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

  inviteUser(email: string, displayName?: string): Observable<{ success: boolean; message: string; inviteRedeemUrl?: string }> {
    return this.http.post<any>(`${this.baseUrl}/invite`, { email, displayName }, this.getHeaders());
  }
}
