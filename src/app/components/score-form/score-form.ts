import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScoreService } from '../../services/scoreService';
import { AuthService } from '../../services/authService';
import { Scorecard } from '../../models/scorecard.interface';
import * as ScorecardActions from '../../store/actions/scorecard.actions';
import * as ScorecardSelectors from '../../store/selectors/scorecard.selectors';

@Component({
  selector: 'app-score-form',
  templateUrl: './score-form.html',
  styleUrls: ['./score-form.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatCardModule,
    MatSnackBarModule
  ]
})
export class ScoreFormComponent implements OnInit, OnDestroy {
  scoreForm: FormGroup;
  loading = false;
  scorecards$: Observable<Scorecard[]>;
  scorecardsLoading$: Observable<boolean>;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private scoreService: ScoreService,
    private snackBar: MatSnackBar,
    private store: Store,
    private authService: AuthService
  ) {
    this.scorecards$ = this.store.select(ScorecardSelectors.selectAllScorecards);
    this.scorecardsLoading$ = this.store.select(ScorecardSelectors.selectScorecardsLoading);
    
    this.scoreForm = this.fb.group({
      name: ['', Validators.required],
      score: [null, [Validators.required, Validators.min(0)]],
      postedScore: [null, [Validators.required, Validators.min(0)]],
      scores: this.fb.array([]),
      scoresToPost: this.fb.array([]),
      usgaIndex: [null, [Validators.min(-10), Validators.max(54)]],
      usgaIndexForTodaysScore: [null, [Validators.min(-10), Validators.max(54)]],
      handicap: [null, [Validators.required, Validators.min(0)]],
      wonTwoBall: [false],
      wonOneBall: [false],
      wonIndo: [false],
      isPaired: [false],
      isScored: [false],
      matchId: [''],
      memberId: [''],
      scorecardId: [''],
      scSlope: [null],
      scRating: [null],
      scPars: this.fb.array([]),
      scHCaps: this.fb.array([]),
      scName: [''],
      datePlayed: [new Date()],
      foursomeIds: this.fb.array([]),
      partnerIds: this.fb.array([])
    });
  }

  get scoresArray() {
    return this.scoreForm.get('scores') as FormArray;
  }

  get scoresToPostArray() {
    return this.scoreForm.get('scoresToPost') as FormArray;
  }

  addScore() {
    this.scoresArray.push(this.fb.control(null));
  }

  removeScore(index: number) {
    this.scoresArray.removeAt(index);
  }

  addScoreToPost() {
    this.scoresToPostArray.push(this.fb.control(null));
  }

  removeScoreToPost(index: number) {
    this.scoresToPostArray.removeAt(index);
  }

  // Getter methods for form validation
  get usgaIndexControl() {
    return this.scoreForm.get('usgaIndex');
  }

  get usgaIndexForTodaysScoreControl() {
    return this.scoreForm.get('usgaIndexForTodaysScore');
  }

  get isUsgaIndexMinError(): boolean {
    return !!(this.usgaIndexControl?.hasError('min') && this.usgaIndexControl?.touched);
  }

  get isUsgaIndexMaxError(): boolean {
    return !!(this.usgaIndexControl?.hasError('max') && this.usgaIndexControl?.touched);
  }

  get isUsgaIndexForTodaysScoreMinError(): boolean {
    return !!(this.usgaIndexForTodaysScoreControl?.hasError('min') && this.usgaIndexForTodaysScoreControl?.touched);
  }

  get isUsgaIndexForTodaysScoreMaxError(): boolean {
    return !!(this.usgaIndexForTodaysScoreControl?.hasError('max') && this.usgaIndexForTodaysScoreControl?.touched);
  }

  submit() {
    if (this.scoreForm.invalid) return;
    this.loading = true;
    
    const formValue = { ...this.scoreForm.value };
    // Convert date to ISO string if it's a Date object
    if (formValue.datePlayed instanceof Date) {
      formValue.datePlayed = formValue.datePlayed.toISOString();
    }

    const author = this.authService.getAuthorObject();
    const scoreData = { ...formValue, author };

    this.scoreService.create(scoreData).subscribe({
      next: () => {
        this.snackBar.open('Score created!', 'Close', { duration: 2000 });
        this.scoreForm.reset();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error creating score', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }

  ngOnInit(): void {
    // Load scorecards for the dropdown
    this.store.dispatch(ScorecardActions.loadScorecards());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onScorecardChange(scorecardId: string): void {
    if (scorecardId) {
      // Auto-populate scorecard-related fields when a scorecard is selected
      this.store.select(ScorecardSelectors.selectScorecardById(scorecardId))
        .pipe(takeUntil(this.destroy$))
        .subscribe(scorecard => {
          if (scorecard) {
            this.scoreForm.patchValue({
              scName: scorecard.name || scorecard.course || '',
              scRating: scorecard.rating || null,
              scSlope: scorecard.slope || null
            });
            
            // If the scorecard has pars, populate the scPars array
            if (scorecard.pars && scorecard.pars.length > 0) {
              const scParsArray = this.scoreForm.get('scPars') as FormArray;
              scParsArray.clear();
              scorecard.pars.forEach(par => {
                scParsArray.push(this.fb.control(par));
              });
            }
            
            // If the scorecard has handicaps, populate the scHCaps array
            if (scorecard.hCaps && scorecard.hCaps.length > 0) {
              const scHCapsArray = this.scoreForm.get('scHCaps') as FormArray;
              scHCapsArray.clear();
              scorecard.hCaps.forEach(hCap => {
                scHCapsArray.push(this.fb.control(hCap));
              });
            }
          }
        });
    } else {
      // Clear scorecard-related fields when no scorecard is selected
      this.scoreForm.patchValue({
        scName: '',
        scRating: null,
        scSlope: null
      });
      (this.scoreForm.get('scPars') as FormArray).clear();
      (this.scoreForm.get('scHCaps') as FormArray).clear();
    }
  }
}