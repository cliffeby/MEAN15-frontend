import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ScorecardService, Scorecard } from '../../services/scorecard';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-scorecard-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './scorecard-list.html',
  styleUrls: ['./scorecard-list.scss']
})
export class ScorecardListComponent implements OnInit {
  scorecards: Scorecard[] = [];
  loading = false;
  displayedColumns: string[] = ['name', 'rating', 'slope', 'par', 'user', 'actions'];

  constructor(
    private scorecardService: ScorecardService,
    private auth: Auth,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadScorecards();
  }

  get isAdmin(): boolean {
    return this.auth.role === 'admin';
  }

  loadScorecards(): void {
    this.loading = true;
    this.scorecardService.getAll().subscribe({
      next: (response) => {
        this.scorecards = response.scorecards || response;
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open('Error loading scorecards: ' + error.message, 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  addScorecard(): void {
    this.router.navigate(['/scorecards/add']);
  }

  editScorecard(id: string): void {
    this.router.navigate(['/scorecards/edit', id]);
  }

  deleteScorecard(id: string): void {
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to delete scorecards.', 'Close', { duration: 3000 });
      return;
    }

    if (confirm('Are you sure you want to delete this scorecard?')) {
      this.scorecardService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Scorecard deleted successfully!', 'Close', { duration: 3000 });
          this.loadScorecards();
        },
        error: (error) => {
          this.snackBar.open('Error deleting scorecard: ' + error.message, 'Close', { duration: 3000 });
        }
      });
    }
  }
}