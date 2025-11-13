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
  report: OrphanReport | null = null;
  loading = false;
  cleanupLoading = false;

  constructor(
    private orphanService: OrphanService,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService,
    private snackBar: MatSnackBar
  ) {}

  get isAdmin(): boolean {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    if (this.isAdmin) {
      this.loadReport();
    }
  }

  loadReport() {
    this.loading = true;
    this.orphanService.getOrphanReport().subscribe({
      next: (response) => {
        this.report = response.report;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orphan report:', error);
        this.snackBar.open('Error loading orphan report', 'Close', { duration: 3000 });
        this.loading = false;
      }
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
}