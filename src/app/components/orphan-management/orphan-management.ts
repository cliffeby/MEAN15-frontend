  
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { OrphanService, OrphanReport } from '../../services/orphanService';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { HCapService } from '../../services/hcapService';
import { ScoreService } from '../../services/scoreService';
import { MatchService } from '../../services/matchService';

@Component({
  selector: 'app-orphan-management',
  templateUrl: './orphan-management.html',
  styleUrls: ['./orphan-management.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatDialogModule
  ]
})
export class OrphanManagementComponent implements OnInit {
  // Removed flaggedOrphanScores and flaggedOrphanHcaps; only using backend-provided orphans
    getSeverityColor(severity: string): string {
      switch (severity) {
        case 'high': return 'warn';
        case 'medium': return 'accent';
        case 'low': return 'primary';
        default: return 'primary';
      }
    }

    getSeverityIcon(severity: string): string {
      switch (severity) {
        case 'high': return 'error';
        case 'medium': return 'warning';
        case 'low': return 'info';
        default: return 'info';
      }
    }
  report: OrphanReport | null = null;
  hcapOrphans: Array<{ hcap: any; reason: string }> = [];
  loading = false;
  // cleanupLoading removed: cleanup not available
  deletingHcapIds = new Set<string>();
  intentionalOrphans: any[] = [];

  constructor(
    private orphanService: OrphanService,
    private hcapService: HCapService,
    private scoreService: ScoreService,
    private matchService: MatchService,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService,
    private snackBar: MatSnackBar
  ) {}

  get isAdmin(): boolean {
    return this.authService.hasMinRole('admin');
  }

  ngOnInit() {
    if (this.isAdmin) {
      this.loadReport();
    }
  }

  deleteHcapOrphan(hcapId: string) {
    if (!hcapId) return;
    this.confirmDialog.confirmAction(
      'Delete Orphaned HCap',
      'Are you sure you want to permanently delete this orphaned HCap record?',
      'Delete',
      'Cancel'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.deletingHcapIds.add(hcapId);
        this.hcapService.delete(hcapId).subscribe({
          next: () => {
            this.snackBar.open('Orphaned HCap deleted', 'Close', { duration: 2000 });
            this.deletingHcapIds.delete(hcapId);
            this.loadReport();
          },
          error: () => {
            this.snackBar.open('Error deleting orphaned HCap', 'Close', { duration: 3000 });
            this.deletingHcapIds.delete(hcapId);
          }
        });
      }
    });
  }

deletingIntentionalOrphanIds = new Set<string>();

  deleteIntentionalOrphan(orphanId: string) {
    if (!orphanId) return;
    this.confirmDialog.confirmAction(
      'Delete Intentional Orphan',
      'Are you sure you want to permanently delete this intentionally orphaned score record?',
      'Delete',
      'Cancel'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.deletingIntentionalOrphanIds.add(orphanId);
        this.scoreService.delete({ id: orphanId }).subscribe({
          next: () => {
            this.snackBar.open('Intentional orphan deleted', 'Close', { duration: 2000 });
            this.deletingIntentionalOrphanIds.delete(orphanId);
            this.loadReport();
          },
          error: () => {
            this.snackBar.open('Error deleting intentional orphan', 'Close', { duration: 3000 });
            this.deletingIntentionalOrphanIds.delete(orphanId);
          }
        });
      }
    });
  }

// ...existing code...

  loadReport() {
    this.loading = true;
    // Fetch all needed data in parallel
    Promise.all([
      this.orphanService.getOrphanReport().toPromise(),
      this.hcapService.getAll().toPromise(),
      this.scoreService.getAll().toPromise(),
      this.matchService.getAll().toPromise(),
    ]).then(([response, hcapRes, scoreRes, matchRes]) => {
      try {
        if (!response || !response.report) {
          console.error('No orphan report data received:', response);
          this.snackBar.open('No orphan report data received', 'Close', { duration: 3000 });
          this.loading = false;
          return;
        }
        if (!scoreRes) {
          console.error('No Score data received:', scoreRes);
          this.snackBar.open('No Score data received', 'Close', { duration: 3000 });
          this.loading = false;
          return;
        }
        if (!matchRes) {
          console.error('No Match data received:', matchRes);
          this.snackBar.open('No Match data received', 'Close', { duration: 3000 });
          this.loading = false;
          return;
        }
        this.report = response.report;
        // Extract flagged orphaned records if present in report
        // Handle both array and object API responses for hcaps, scores, matches
        // hcaps and scores are already declared above, remove duplicate declarations
        // matches is already declared above, remove duplicate declaration

        // Handle both array and object API responses for hcaps, scores, matches
        const hcaps = Array.isArray(hcapRes) ? hcapRes : (typeof hcapRes === 'object' && 'hcaps' in hcapRes ? (hcapRes as any).hcaps : []);
        const scores = Array.isArray(scoreRes) ? scoreRes : (typeof scoreRes === 'object' && 'scores' in scoreRes ? (scoreRes as any).scores : []);
        const matches = Array.isArray(matchRes) ? matchRes : (typeof matchRes === 'object' && 'matches' in matchRes ? (matchRes as any).matches : []);
        // Add intentionally orphaned scores from backend report if present
        // Store intentionalOrphans in a component property for template safety
        if (this.report && Array.isArray((this.report as any).intentionalOrphans)) {
          this.intentionalOrphans = (this.report as any).intentionalOrphans;
        } else if (this.report && this.report.details && Array.isArray((this.report.details as any).intentionalOrphans)) {
          this.intentionalOrphans = (this.report.details as any).intentionalOrphans;
        } else if (this.report && (this.report as any).scoreOrphans && Array.isArray((this.report as any).scoreOrphans.intentionalOrphans)) {
          this.intentionalOrphans = (this.report as any).scoreOrphans.intentionalOrphans;
        } else {
          // Fallback to frontend logic if backend not present
          this.intentionalOrphans = scores.filter((s: any) => s.orphaned === true && (s.matchId == null || s.matchId === 'null'));
        }
        // No longer tracking flaggedOrphanScores or flaggedOrphanHcaps in frontend
        this.hcapOrphans = this.orphanService.findOrphanedHcaps(hcaps, scores, matches);
        // Optionally, add to report.details
        console.log('HCap Orphans found:', this.hcapOrphans);
        if (this.report && this.report.details) {
          (this.report.details as any).hcapOrphans = this.hcapOrphans;
          if (this.report.summary) {
            (this.report.summary as any).hcapOrphans = this.hcapOrphans.length;
            this.report.summary.totalOrphans += this.hcapOrphans.length;
          }
        }
        this.loading = false;
      } catch (err) {
        console.error('Exception while processing orphan report or hcap orphans:', err);
        this.snackBar.open('Error processing orphan report', 'Close', { duration: 3000 });
        this.loading = false;
      }
    }).catch(error => {
      console.error('Error loading orphan report or hcap orphans (API call failed):', error);
      this.snackBar.open('Error loading orphan report', 'Close', { duration: 3000 });
      this.loading = false;
    });
  }

  // cleanupOrphans removed: cleanup not available
}
