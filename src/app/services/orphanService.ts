import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './authService';
import { environment } from '../../environments/environment';

export interface OrphanReport {
  summary: {
    totalOrphans: number;
    matchOrphans: number;
    memberOrphans: number;
    scorecardOrphans: number;
    userOrphans: number;
  };
  details: {
    matchOrphans: any[];
    memberOrphans: any[];
    scorecardOrphans: any[];
    userOrphans: any[];
  };
  recommendations: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface CleanupResult {
  cleaned: number;
  deleted: number;
  nullified: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class OrphanService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/orphans`;

  private getHeaders() {
    const token = this.auth.token();
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('OrphanService error:', error);
    let errorMsg = 'An unexpected error occurred. Please try again later.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Client error: ${error.error.message}`;
    } else {
      errorMsg = `Server error (${error.status}): ${error.error?.message || error.message}`;
    }
    return throwError(() => new Error(errorMsg));
  }

  /**
   * Get orphaned records report
   */
  getOrphanReport(): Observable<{ success: boolean; report: OrphanReport }> {
    return this.http.get<{ success: boolean; report: OrphanReport }>(`${this.baseUrl}/report`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  /**
   * Find orphaned scores
   */
  findOrphans(): Observable<any> {
    return this.http.get(`${this.baseUrl}/find`, this.getHeaders())
      .pipe(catchError(this.handleError));
  }

  /**
   * Clean up orphaned records
   * @param strategy 'delete' | 'nullify' | 'preserve'
   */
  cleanupOrphans(strategy: 'delete' | 'nullify' | 'preserve'): Observable<{ success: boolean; results: CleanupResult }> {
    return this.http.post<{ success: boolean; results: CleanupResult }>(
      `${this.baseUrl}/cleanup`, 
      { strategy }, 
      this.getHeaders()
    ).pipe(catchError(this.handleError));
  }

  /**
   * Finds HCap records that do not have a matching Score or Match record.
   * @param hcaps Array of HCap records
   * @param scores Array of Score records
   * @param matches Array of Match records
   * @returns Array of orphaned HCap records with reason
   */
  findOrphanedHcaps(hcaps: any[], scores: any[], matches: any[]): Array<{ hcap: any; reason: string }> {
    const scoreIds = new Set(scores.map(s => s._id || s.scoreId));
    const matchIds = new Set(matches.map(m => m._id));

    return hcaps
      .map(hcap => {
        let reason = '';
        if (hcap.scoreId && !scoreIds.has(hcap.scoreId)) {
          reason = 'No matching Score record';
        }
        if (hcap.matchId && !matchIds.has(hcap.matchId)) {
          reason = reason ? reason + ' and no matching Match record' : 'No matching Match record';
        }
        if (reason) {
          return { hcap, reason };
        }
        return null;
      })
      .filter((x): x is { hcap: any; reason: string } => !!x);
  }
}