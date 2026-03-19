import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { Scorecard } from '../../models/scorecard.interface';
import { AuthService } from '../../services/authService';
import { ConfigurationService } from '../../services/configuration.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import * as ScorecardActions from '../../store/actions/scorecard.actions';
import * as ScorecardSelectors from '../../store/selectors/scorecard.selectors';
import { map } from 'rxjs/operators';

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
export class ScorecardListComponent implements OnInit, OnDestroy {
  @HostBinding('class.dark-theme') isDarkTheme = false;
  private mqListener: ((e: MediaQueryListEvent) => void) | null = null;
  private configSub: Subscription | null = null;

  scorecards$: Observable<Scorecard[]>;
  sortedScorecards$: Observable<Scorecard[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  displayedColumns: string[] = ['course','tees', 'rating', 'slope', 'par', 'author', 'actions'];

  constructor(
    private store: Store,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private confirmDialog: ConfirmDialogService,
    private configService: ConfigurationService
  ) {
    this.scorecards$ = this.store.select(ScorecardSelectors.selectAllScorecards);
    this.sortedScorecards$ = this.scorecards$.pipe(
      map((scorecards: Scorecard[]) => {
        return [...scorecards].sort((a, b) => {
          const courseA = a.course || '';
          const courseB = b.course || '';
          const teesA = a.tees || '';
          const teesB = b.tees || '';
          const courseCompare = courseA.localeCompare(courseB);
          if (courseCompare !== 0) return courseCompare;
          return teesA.localeCompare(teesB);
        });
      })
    );
    this.loading$ = this.store.select(ScorecardSelectors.selectScorecardsLoading);
    this.error$ = this.store.select(ScorecardSelectors.selectScorecardsError);
  }

  ngOnInit(): void {
    this.store.dispatch(ScorecardActions.loadScorecards());
    try {
      this.applyTheme(this.configService.displayConfig().theme);
    } catch { /* ignore in test environments */ }
    this.configSub = this.configService.config$.subscribe(cfg => {
      this.applyTheme(cfg.display.theme);
    });
  }

  ngOnDestroy(): void {
    this.configSub?.unsubscribe();
    if (this.mqListener && typeof window !== 'undefined' && (window as any).matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.mqListener);
      this.mqListener = null;
    }
  }

  get isAuthorized(): boolean {
    return this.authService.hasMinRole('fieldhand');
  }
  get isAuthorizedToDelete(): boolean {
    return this.authService.hasMinRole('admin');
  }
  get authorName(): string | null {
    return this.authService.getAuthorName();
  }
  

  addScorecard(): void {
    if (!this.isAuthorized) {
      this.snackBar.open('You are not authorized to add scorecards.', 'Close', { duration: 3000 });
      return;
    }
    this.router.navigate(['/scorecards/add']);
  }

  editScorecard(id: string): void {
    if (!this.isAuthorized) {
      this.snackBar.open('You are not authorized to edit scorecards.', 'Close', { duration: 3000 });
      return;
    }
    this.router.navigate(['/scorecards/edit', id]);
  }

  deleteScorecard(id: string): void {
    if (!this.isAuthorizedToDelete) {
      this.snackBar.open('You are not authorized to delete scorecards.', 'Close', { duration: 3000 });
      return;
    }

    // Get the scorecard details for the confirmation dialog
    this.store.select(ScorecardSelectors.selectScorecardById(id)).subscribe(scorecard => {
      if (scorecard) {
        const scorecardName = scorecard.course || 'Unnamed Scorecard';
        
        this.confirmDialog.confirmDelete(scorecardName, 'scorecard').subscribe(confirmed => {
          if (confirmed) {
            // Dispatch delete action with id, scorecardName, and authorName
            const authorName = this.authorName || '';
            this.store.dispatch(ScorecardActions.deleteScorecard({ id, name: scorecardName, authorName: authorName }));
          }
        });
      }
    });
  }

  private applyTheme(theme: string) {
    if (!theme) theme = 'auto';
    if (theme === 'dark') {
      this.setDark(true);
    } else if (theme === 'light') {
      this.setDark(false);
    } else {
      if (typeof window !== 'undefined' && (window as any).matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        this.setDark(!!mq.matches);
        if (this.mqListener) {
          mq.removeEventListener('change', this.mqListener);
        }
        this.mqListener = (e: MediaQueryListEvent) => this.setDark(!!e.matches);
        mq.addEventListener('change', this.mqListener);
      } else {
        this.setDark(false);
      }
    }
  }

  private setDark(val: boolean) {
    this.isDarkTheme = val;
  }
}