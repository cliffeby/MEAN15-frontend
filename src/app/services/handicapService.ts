import { Injectable, inject } from '@angular/core';
import { ConfigurationService } from './configuration.service';

// HCap record interface (minimal)
export interface HCapRecord {
  scoreDifferential: number; // already equitably pre-adjusted
  date?: string;
  // ...other fields
}

@Injectable({ providedIn: 'root' })
export class HandicapService {
  private configService = inject(ConfigurationService);

  /**
   * Compute handicap index using selected method from configuration
   * @param hcapRecords Array of HCapRecord (must have scoreDifferential)
   * @returns string: handicap (e.g. '12.3' or '12.3*' if not enough scores)
   */
  computeHandicap(hcapRecords: HCapRecord[]): string {
    // Update the type of handicapCalculationMethod in your configuration service to include 'roch'
    const method = this.configService.configSignal().scoring.handicapCalculationMethod as 'usga' | 'roch' | 'ega' | 'custom';
    if (method === 'usga') {
      return this.computeUSGA(hcapRecords);
    } else if (method === 'roch') {
      return this.computeRoch(hcapRecords);
    } else {
      // fallback to USGA if unknown
      return this.computeUSGA(hcapRecords);
    }
  }

  /**
   * USGA handicap calculation 
   */
  computeUSGA(hcapRecords: HCapRecord[]): string {
    if (!hcapRecords || hcapRecords.length === 0) return '';
    // Only use most recent 20 scores
    const sorted = [...hcapRecords]
      .filter((r) => typeof r.scoreDifferential === 'number' && r.scoreDifferential !== 0)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const differentials = sorted.slice(0, 20).map((r) => r.scoreDifferential);
    const n = differentials.length;
    if (n === 0) return '';
    // USGA: number of differentials to use
    const numToUse = this.numDifferentialsToUseUSGA(n);
    const used = [...differentials].sort((a, b) => a - b).slice(0, numToUse);
    const avg = used.reduce((sum, d) => sum + d, 0) / used.length;
    console.log('USGA Handicap Calculation: n=', n, 'numToUse=', numToUse, 'used differentials=', used, 'diff', differentials);
    let handicap = Math.round(avg * 0.96 * 10) / 10;
    // Clamp to max 54.0
    if (handicap > 54) handicap = 54.0;
    // Show * if not enough scores
    const needsAsterisk = n < 3 || numToUse < 3;
    return handicap.toFixed(1) + (needsAsterisk ? '*' : '');
  }

  /**
   * Placeholder for Roch handicap calculation (TBD)
   */
  computeRoch(hcapRecords: HCapRecord[]): string {
    if (!hcapRecords || hcapRecords.length === 0) return '';
    // Only use most recent 8 scores
    const sorted = [...hcapRecords]
      .filter((r) => typeof r.scoreDifferential === 'number' && r.scoreDifferential !== 0)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const differentials = sorted.slice(0, 8).map((r) => r.scoreDifferential);
    const n = differentials.length;
    if (n === 0) return '';
    // USGA: number of differentials to use
    const numToUse = this.numDifferentialsToUseROCH(n);
    const used = [...differentials].sort((a, b) => a - b).slice(0, numToUse);
    console.log('Roch Handicap Calculation: n=', n, 'numToUse=', numToUse, 'used differentials=', used, 'diff', differentials);
    const avg = used.reduce((sum, d) => sum + d, 0) / used.length;
    let handicap = Math.round(avg * 10) / 10;
    // Clamp to max 54.0
    if (handicap > 26) handicap = 26.0;
    // Show * if not enough scores
    const needsAsterisk = n < 3 || numToUse < 3;
    return handicap.toFixed(1) + (needsAsterisk ? '*' : '');
  }


  /**
   * USGA table: how many differentials to use for n scores
   */
  numDifferentialsToUseUSGA(n: number): number {
    if (n < 3) return 1;
    if (n === 3) return 1;
    if (n === 4) return 1;
    if (n === 5) return 1;
    if (n === 6) return 2;
    if (n === 7) return 2;
    if (n === 8) return 2;
    if (n >= 9 && n <= 11) return 3;
    if (n >= 12 && n <= 14) return 4;
    if (n >= 15 && n <= 16) return 5;
    if (n === 17) return 6;
    if (n === 18) return 7;
    if (n === 19) return 8;
    if (n >= 20) return 8;
    return 1;
  }
  numDifferentialsToUseROCH(n: number): number {
    if (n <= 3) return 1;
    if (n === 4) return 2;
    if (n === 5) return 3;
    if (n === 6) return 4;
    if (n >= 7) return 5;
    return 1;
  }

  // ---------------------------------------------------------------------------
  // Score-record-based computation (raw Score documents with scRating/scSlope)
  // ---------------------------------------------------------------------------

  /**
   * Compute score differential from a raw Score document.
   * Returns 0 if rating/slope are missing or invalid.
   */
  scoreDifferentialFromScore(score: any): number {
    const posted = score.postedScore ?? score.score ?? 0;
    const rating = score.scRating;
    const slope = score.scSlope;
    if (
      typeof posted === 'number' && posted > 0 &&
      typeof rating === 'number' &&
      typeof slope === 'number' && slope > 0
    ) {
      return parseFloat((((posted - rating) * 113) / slope).toFixed(1));
    }
    return 0;
  }

  /**
   * Compute handicap from raw Score documents using the configured method.
   * Pass up to 20 records; method limits internally.
   */
  computeHandicapFromScores(scores: any[]): string {
    const method = this.configService.configSignal().scoring.handicapCalculationMethod as 'usga' | 'roch' | 'ega' | 'custom';
    if (method === 'roch') {
      return this.computeRochFromScores(scores);
    }
    return this.computeUSGAFromScores(scores);
  }

  /**
   * USGA method from raw Score documents.
   * Sorts by datePlayed descending, takes up to 20, converts to HCapRecords and delegates to computeUSGA.
   */
  computeUSGAFromScores(scores: any[]): string {
    if (!scores || scores.length === 0) return '';
    const records = scores
      .map(s => ({
        scoreDifferential: this.scoreDifferentialFromScore(s),
        date: s.datePlayed || s.createdAt || '',
      }))
      .filter(r => r.scoreDifferential !== 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
    console.log('USGA Handicap Calculation from Scores: records=', records);
    return this.computeUSGA(records);
  }

  /**
   * Roch method from raw Score documents.
   * Sorts by datePlayed descending, takes up to 8, converts to HCapRecords and delegates to computeRoch.
   */
  computeRochFromScores(scores: any[]): string {
    if (!scores || scores.length === 0) return '';
    const records = scores
      .map(s => ({
        scoreDifferential: this.scoreDifferentialFromScore(s),
        date: s.datePlayed || s.createdAt || '',
      }))
      .filter(r => r.scoreDifferential !== 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
    return this.computeRoch(records);
  }

}
