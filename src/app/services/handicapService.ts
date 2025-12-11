import { Injectable } from '@angular/core';

// HCap record interface (minimal)
export interface HCapRecord {
  scoreDifferential: number; // already equitably pre-adjusted
  date?: string;
  // ...other fields
}

@Injectable({ providedIn: 'root' })
export class HandicapService {
  /**
   * Compute USGA handicap index from hcap records (pre-adjusted differentials)
   * @param hcapRecords Array of HCapRecord (must have scoreDifferential)
   * @returns string: handicap (e.g. '12.3' or '12.3*' if not enough scores)
   */
  computeHandicap(hcapRecords: HCapRecord[]): string {
    if (!hcapRecords || hcapRecords.length === 0) return '';
    // Only use most recent 20 scores
    const sorted = [...hcapRecords]
      .filter((r) => typeof r.scoreDifferential === 'number')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const differentials = sorted.slice(0, 20).map((r) => r.scoreDifferential);
    const n = differentials.length;
    if (n === 0) return '';
    // USGA: number of differentials to use
    // 3:1, 4:1, 5:1, 6:2, 7-8:2, 9-11:3, 12-14:4, 15-16:5, 17:6, 18:7, 19:8, 20:8
    const numToUse = this.numDifferentialsToUse(n);
    const used = [...differentials].sort((a, b) => a - b).slice(0, numToUse);
    const avg = used.reduce((sum, d) => sum + d, 0) / used.length;
    let handicap = Math.round(avg * 0.96 * 10) / 10;
    // Clamp to max 54.0
    if (handicap > 54) handicap = 54.0;
    // Show * if not enough scores
    const needsAsterisk = n < 3 || numToUse < 3;
    return handicap.toFixed(1) + (needsAsterisk ? '*' : '');
  }

  /**
   * USGA table: how many differentials to use for n scores
   */
  numDifferentialsToUse(n: number): number {
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
}
