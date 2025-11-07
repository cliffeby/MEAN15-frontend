import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Scorecard } from '../../services/scorecardService';
import * as MatchActions from '../../store/actions/match.actions';
import * as ScorecardActions from '../../store/actions/scorecard.actions';
import { selectMatchesLoading, selectMatchesError } from '../../store/selectors/match.selectors';
import * as ScorecardSelectors from '../../store/selectors/scorecard.selectors';

@Component({
  selector: 'app-match-form',
  templateUrl: './match-form.html',
  styleUrls: ['./match-form.scss'],
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
export class MatchFormComponent implements OnInit, OnDestroy {
  matchForm: FormGroup;
  loading$: Observable<boolean>;
  error$: Observable<any>;
  scorecards$: Observable<Scorecard[]>;
  scorecardsLoading$: Observable<boolean>;
  private unsubscribe$ = new Subject<void>();

  statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    this.loading$ = this.store.select(selectMatchesLoading);
    this.error$ = this.store.select(selectMatchesError);
    this.scorecards$ = this.store.select(ScorecardSelectors.selectAllScorecards);
    this.scorecardsLoading$ = this.store.select(ScorecardSelectors.selectScorecardsLoading);
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
  }

  ngOnInit() {
    // Dispatch action to load scorecards
    this.store.dispatch(ScorecardActions.loadScorecards());
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  onScorecardChange(scorecardId: string) {
    // Use the scorecard selector to find the specific scorecard
    this.store.select(ScorecardSelectors.selectScorecardById(scorecardId))
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(selectedScorecard => {
        if (selectedScorecard) {
          this.matchForm.patchValue({
            scGroupName: selectedScorecard.groupName || selectedScorecard.name || ''
          });
        }
      });
  }

  submit() {
    if (this.matchForm.invalid) return;
    
    const formValue = { ...this.matchForm.value };
    // Convert date to ISO string if it's a Date object
    if (formValue.datePlayed instanceof Date) {
      formValue.datePlayed = formValue.datePlayed.toISOString();
    }

    // Dispatch NgRx action to create match
    this.store.dispatch(MatchActions.createMatch({ match: formValue }));
    
    // Reset form after dispatching (effects will handle navigation and notifications)
    this.resetForm();
  }

  private resetForm() {
    this.matchForm.reset();
    // Reset to default values
    this.matchForm.patchValue({
      status: 'open',
      datePlayed: new Date(),
      lineUps: {}
    });
  }
}