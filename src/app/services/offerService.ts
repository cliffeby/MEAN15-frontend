import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Offer } from '../models/offer';
import { AuthService } from './authService';

@Injectable({
  providedIn: 'root',
})
export class OffersService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = 'http://localhost:5001/api/offers';

  // Generate headers with JWT token
  private getHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token()}` }) };
  }

  // Get all offers
  getOffers(): Observable<Offer[]> {
    return this.http.get<Offer[]>(this.baseUrl, this.getHeaders()).pipe(
      map((offers) =>
        offers.map((offer: any) => ({
          ...offer,
          id: offer._id,
        }))
      )
    );
  }

  // Get offer by id
  getOfferById(id: string): Observable<Offer> {
    return this.http.get<Offer>(`${this.baseUrl}/${id}`, this.getHeaders());
  }

  // Create new offer
  createOffer(offer: Offer): Observable<Offer> {
    return this.http.post<Offer>(this.baseUrl, offer, this.getHeaders());
  }

  // Update offer
  updateOffer(id: string, offer: Offer): Observable<Offer> {
    return this.http.put<Offer>(`${this.baseUrl}/${id}`, offer, this.getHeaders());
  }

  // Delete offer
  deleteOffer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.getHeaders());
  }
}
