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
    intentionalOrphans: number;
  };
  details: {
    matchOrphans: any[];
    memberOrphans: any[];
    scorecardOrphans: any[];
    userOrphans: any[];
    intentionalOrphans: any[];
  };
  recommendations: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  flaggedOrphanScores?: any[];
  flaggedOrphanHcaps?: any[];
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

  // cleanupOrphans removed: backend not implemented, UI removed

  /**
   * Finds HCap records that do not have a matching Score or Match record.
   * @param hcaps Array of HCap records
   * @param scores Array of Score records
   * @param matches Array of Match records
   * @returns Array of orphaned HCap records with reason
   */
  findOrphanedHcaps(hcaps: any[], scores: any[], matches: any[]): Array<{ hcap: any; reason: string }> {
    // Helper to extract string ID from either a raw ObjectID or a populated object { _id, ... }
    const toIdStr = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'object' && val._id) return String(val._id);
      return String(val);
    };

    const scoreIds = new Set(scores.map(s => String(s._id)));
    const matchIds = new Set(matches.map(m => String(m._id)));

    return hcaps
      .filter(hcap => hcap.orphaned !== true) // skip intentionally orphaned records
      .map(hcap => {
        const scoreIdStr = toIdStr(hcap.scoreId);
        const matchIdStr = toIdStr(hcap.matchId);
        const scoreMissing = !scoreIdStr || !scoreIds.has(scoreIdStr);
        const matchMissing = !matchIdStr || !matchIds.has(matchIdStr);
        if (matchMissing && scoreMissing) {
          return { hcap, reason: 'No matching Score or Match record' };
        }
        if (matchMissing) {
          return { hcap, reason: `matchId "${matchIdStr}" references a non-existent match` };
        }
        if (scoreMissing) {
          return { hcap, reason: `scoreId "${scoreIdStr}" references a non-existent score` };
        }
        return null;
      })
      .filter((x): x is { hcap: any; reason: string } => !!x);
  }
}