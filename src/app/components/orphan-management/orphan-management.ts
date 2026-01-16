import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { OrphanService, OrphanReport, CleanupResult } from '../../services/orphanService';
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
  cleanupLoading = false;
  deletingHcapIds = new Set<string>();

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

  deleteAllHcapOrphans() {
    if (!this.hcapOrphans.length) return;
    this.confirmDialog.confirmAction(
      'Delete All Orphaned HCaps',
      `Are you sure you want to permanently delete all ${this.hcapOrphans.length} orphaned HCap records?`,
      'Delete All',
      'Cancel'
    ).subscribe(confirmed => {
      if (confirmed) {
        const ids = this.hcapOrphans.map(o => o.hcap._id || o.hcap.id || o.hcap.scoreId).filter(Boolean);
        let completed = 0;
        let errored = 0;
        ids.forEach(id => {
          this.deletingHcapIds.add(id);
          this.hcapService.delete(id).subscribe({
            next: () => {
              completed++;
              this.deletingHcapIds.delete(id);
              if (completed + errored === ids.length) {
                this.snackBar.open(`Deleted ${completed} orphaned HCaps`, 'Close', { duration: 3000 });
                this.loadReport();
              }
            },
            error: () => {
              errored++;
              this.deletingHcapIds.delete(id);
              if (completed + errored === ids.length) {
                this.snackBar.open(`Deleted ${completed} orphaned HCaps, ${errored} errors`, 'Close', { duration: 4000 });
                this.loadReport();
              }
            }
          });
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
        if (!hcapRes) {
          console.error('No HCap data received:', hcapRes);
          this.snackBar.open('No HCap data received', 'Close', { duration: 3000 });
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
        // Handle both array and object API responses for hcaps, scores, matches
        const hcaps = Array.isArray(hcapRes) ? hcapRes : (typeof hcapRes === 'object' && 'hcaps' in hcapRes ? (hcapRes as any).hcaps : []);
        const scores = Array.isArray(scoreRes) ? scoreRes : (typeof scoreRes === 'object' && 'scores' in scoreRes ? (scoreRes as any).scores : []);
        const matches = Array.isArray(matchRes) ? matchRes : (typeof matchRes === 'object' && 'matches' in matchRes ? (matchRes as any).matches : []);
        this.hcapOrphans = this.orphanService.findOrphanedHcaps(hcaps, scores, matches);
        // Optionally, add to report.details
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

  cleanupOrphans(strategy: 'delete' | 'nullify' | 'preserve') {
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to perform this action.', 'Close', { duration: 2500 });
      return;
    }

    const strategyDescriptions = {
      delete: 'permanently delete all orphaned scores',
      nullify: 'remove orphaned references (recommended)',
      preserve: 'keep orphaned scores for manual review'
    };

    const message = `This will ${strategyDescriptions[strategy]}. This action cannot be undone.`;
    
    this.confirmDialog.confirmAction(
      'Clean Up Orphaned Records',
      message,
      'Continue',
      'Cancel'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.cleanupLoading = true;
        this.orphanService.cleanupOrphans(strategy).subscribe({
          next: (response) => {
            const result = response.results;
            let message = `Cleanup completed: `;
            
            if (result.deleted > 0) message += `${result.deleted} deleted, `;
            if (result.nullified > 0) message += `${result.nullified} nullified, `;
            if (result.cleaned > 0) message += `${result.cleaned} cleaned, `;
            
            message = message.replace(/, $/, '');
            
            this.snackBar.open(message, 'Close', { duration: 4000 });
            this.cleanupLoading = false;
            this.loadReport(); // Refresh the report
          },
          error: (error) => {
            console.error('Error during cleanup:', error);
            this.snackBar.open('Error during cleanup operation', 'Close', { duration: 3000 });
            this.cleanupLoading = false;
          }
        });
      }
    });
  }
}
