import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Match } from '../../models/match';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import * as MatchActions from '../../store/actions/match.actions';
import { 
  selectAllMatches, 
  selectMatchesLoading, 
  selectMatchesError,
  selectMatchStats,
  selectMatchById
} from '../../store/selectors/match.selectors';

@Component({
  selector: 'app-match-list',
  templateUrl: './match-list.html',
  styleUrls: ['./match-list.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressBarModule,
    MatChipsModule
  ]
})
export class MatchListComponent implements OnInit, OnDestroy {
  matches$: Observable<Match[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;
  stats$: Observable<any>;
  
  private unsubscribe$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.matches$ = this.store.select(selectAllMatches);
    this.loading$ = this.store.select(selectMatchesLoading);
    this.error$ = this.store.select(selectMatchesError);
    this.stats$ = this.store.select(selectMatchStats);
  }

  get isAdmin(): boolean {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    // Dispatch action to load matches
    this.store.dispatch(MatchActions.loadMatches());
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  editMatch(id: string) {
    this.router.navigate(['/matches/edit', id]);
  }

  addMatch() {
    this.router.navigate(['/matches/add']);
  }

  deleteMatch(id: string) {
    if (!id) return;
    if (!this.isAdmin) {
      // The effects will handle the error snackbar display
      return;
    }

    // Get the match details for the confirmation dialog
    this.store.select(selectMatchById(id))
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(match => {
        if (match) {
          const matchName = match.name || `Match ${id}`;
          
          this.confirmDialog.confirmDelete(matchName, 'match').subscribe(confirmed => {
            if (confirmed) {
              this.store.dispatch(MatchActions.deleteMatch({ id }));
            }
          });
        }
      });
  }

  updateStatus(id: string, status: string) {
    this.store.dispatch(MatchActions.updateMatchStatus({ id, status }));
  }

  refreshMatches() {
    this.store.dispatch(MatchActions.loadMatches());
  }

  loadMatchesByStatus(status: string) {
    this.store.dispatch(MatchActions.loadMatchesByStatus({ status }));
  }

  loadAllMatches() {
    this.store.dispatch(MatchActions.loadMatches());
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'open': return 'primary';
      case 'closed': return 'accent';
      case 'completed': return 'warn';
      default: return '';
    }
  }
}