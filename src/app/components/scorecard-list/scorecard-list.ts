import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Scorecard } from '../../models/scorecard.interface';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import * as ScorecardActions from '../../store/actions/scorecard.actions';
import * as ScorecardSelectors from '../../store/selectors/scorecard.selectors';

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
  scorecards$: Observable<Scorecard[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  displayedColumns: string[] = ['name', 'rating', 'slope', 'par', 'user', 'actions'];

  constructor(
    private store: Store,
    private auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private confirmDialog: ConfirmDialogService
  ) {
    this.scorecards$ = this.store.select(ScorecardSelectors.selectAllScorecards);
    this.loading$ = this.store.select(ScorecardSelectors.selectScorecardsLoading);
    this.error$ = this.store.select(ScorecardSelectors.selectScorecardsError);
  }

  ngOnInit(): void {
    // Dispatch action to load scorecards
    this.store.dispatch(ScorecardActions.loadScorecards());
  }

  get isAdmin(): boolean {
    return this.auth.hasMinRole('admin');
  }

  addScorecard(): void {
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to add scorecards.', 'Close', { duration: 3000 });
      return;
    }
    this.router.navigate(['/scorecards/add']);
  }

  editScorecard(id: string): void {
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to edit scorecards.', 'Close', { duration: 3000 });
      return;
    }
    this.router.navigate(['/scorecards/edit', id]);
  }

  deleteScorecard(id: string): void {
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to delete scorecards.', 'Close', { duration: 3000 });
      return;
    }

    // Get the scorecard details for the confirmation dialog
    this.store.select(ScorecardSelectors.selectScorecardById(id)).subscribe(scorecard => {
      if (scorecard) {
        const scorecardName = scorecard.name || scorecard.groupName || 'Unnamed Scorecard';
        
        this.confirmDialog.confirmDelete(scorecardName, 'scorecard').subscribe(confirmed => {
          if (confirmed) {
            // Dispatch delete action - effects will handle the API call and notifications
            this.store.dispatch(ScorecardActions.deleteScorecard({ id }));
          }
        });
      }
    });
  }
}