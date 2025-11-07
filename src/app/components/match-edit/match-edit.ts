import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Scorecard } from '../../services/scorecardService';
import { Match } from '../../models/match';
import * as MatchActions from '../../store/actions/match.actions';
import * as MatchSelectors from '../../store/selectors/match.selectors';
import * as ScorecardActions from '../../store/actions/scorecard.actions';
import * as ScorecardSelectors from '../../store/selectors/scorecard.selectors';

@Component({
  selector: 'app-match-edit',
  templateUrl: './match-edit.html',
  styleUrls: ['./match-edit.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ]
})
export class MatchEditComponent implements OnInit, OnDestroy {
  matchForm: FormGroup;
  loading$: Observable<boolean>;
  currentMatch$: Observable<Match | null>;
  matchId: string | null = null;
  scorecards$: Observable<Scorecard[]>;
  scorecardsLoading$: Observable<boolean>;
  private destroy$ = new Subject<void>();

  statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private snackBar: MatSnackBar
  ) {
    this.matchForm = this.fb.group({
      name: ['', Validators.required],
      scorecardId: [''],
      scGroupName: [''],
      players: [null, [Validators.min(1), Validators.max(144)]],
      status: ['open', Validators.required],
      lineUps: [{}],
      datePlayed: [new Date(), Validators.required],
      user: ['', Validators.required]
    });

    this.loading$ = this.store.select(MatchSelectors.selectMatchesLoading);
    this.currentMatch$ = this.store.select(MatchSelectors.selectCurrentMatch);
    this.scorecards$ = this.store.select(ScorecardSelectors.selectAllScorecards);
    this.scorecardsLoading$ = this.store.select(ScorecardSelectors.selectScorecardsLoading);
  }

  ngOnInit() {
    // Load scorecards
    this.store.dispatch(ScorecardActions.loadScorecards());
    
    this.matchId = this.route.snapshot.paramMap.get('id');
    
    if (this.matchId) {
      // Dispatch action to load the match
      this.store.dispatch(MatchActions.loadMatch({ id: this.matchId }));
      
      // Subscribe to current match and populate form when it changes
      this.currentMatch$
        .pipe(takeUntil(this.destroy$))
        .subscribe(match => {
          if (match) {
            this.populateForm(match);
          }
        });
    }
  }



  populateForm(match: Match) {
    this.matchForm.patchValue({
      name: match.name,
      scorecardId: match.scorecardId,
      scGroupName: match.scGroupName,
      players: match.players,
      status: match.status,
      lineUps: match.lineUps || {},
      datePlayed: match.datePlayed ? new Date(match.datePlayed) : new Date(),
      user: match.user
    });
  }

  submit() {
    if (this.matchForm.invalid || !this.matchId) return;
    
    const formValue = { ...this.matchForm.value };
    // Convert date to ISO string if it's a Date object
    if (formValue.datePlayed instanceof Date) {
      formValue.datePlayed = formValue.datePlayed.toISOString();
    }

    // Dispatch the update action - effects will handle the API call and navigation
    this.store.dispatch(MatchActions.updateMatch({ 
      id: this.matchId, 
      match: formValue 
    }));
  }

  onScorecardChange(scorecardId: string) {
    // Use the scorecard selector to find the specific scorecard
    this.store.select(ScorecardSelectors.selectScorecardById(scorecardId))
      .pipe(takeUntil(this.destroy$))
      .subscribe(selectedScorecard => {
        if (selectedScorecard) {
          this.matchForm.patchValue({
            scGroupName: selectedScorecard.groupName || selectedScorecard.name || ''
          });
        }
      });
  }

  cancel() {
    this.router.navigate(['/matches']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}