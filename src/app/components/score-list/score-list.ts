import { Component, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { ScoreService } from '../../services/scoreService';
import { Score } from '../../models/score';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/authService';

@Component({
  selector: 'app-score-list',
  templateUrl: './score-list.html',
  styleUrls: ['./score-list.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressBarModule
  ]
})
export class ScoreListComponent implements OnInit {
  scores: Score[] = [];
  loading = false;

  constructor(
    private scoreService: ScoreService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  get isAdmin(): boolean {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    this.loadScores();
  }

  loadScores() {
    this.loading = true;
    this.scoreService.getAll().subscribe({
      next: (res) => {
        console.log('Scores loaded:', res);    
        this.scores = res.scores || res;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error loading scores', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }

  editScore(id: string) {
    this.router.navigate(['/scores/edit', id]);
  }

  addScore() {
    this.router.navigate(['/scores/add']);
  }

  deleteScore(id: string) {
    if (!id) return;
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to delete scores.', 'Close', { duration: 2500 });
      return;
    }
    if (confirm('Are you sure you want to delete this score?')) {
      this.scoreService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Score deleted', 'Close', { duration: 2000 });
          this.loadScores();
        },
        error: (err) => {
          if (err.status === 403 || err.status === 401) {
            this.snackBar.open('You are not authorized to delete scores.', 'Close', { duration: 2500 });
          } else {
            this.snackBar.open('Error deleting score', 'Close', { duration: 2000 });
          }
        }
      });
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  formatScore(score: number): string {
    return score ? score.toString() : 'N/A';
  }
}