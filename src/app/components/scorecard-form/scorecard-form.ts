import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Scorecard } from '../../models/scorecard.interface';
import * as ScorecardActions from '../../store/actions/scorecard.actions';
import * as ScorecardSelectors from '../../store/selectors/scorecard.selectors';

@Component({
  selector: 'app-scorecard-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './scorecard-form.html',
  styleUrls: ['./scorecard-form.scss']
})
export class ScorecardFormComponent implements OnInit, OnDestroy {
  scorecardForm: FormGroup;
  isEditMode = false;
  scorecardId: string | null = null;
  loading$: Observable<boolean>;
  currentScorecard$: Observable<Scorecard | null>;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.scorecardForm = this.fb.group({
      groupName: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      rating: [0, [Validators.required, Validators.min(50), Validators.max(85)]],
      slope: [0, [Validators.required, Validators.min(55), Validators.max(155)]],
      par: [0, [Validators.required, Validators.min(60), Validators.max(80)]],
      parInputString: [''],
      hCapInputString: [''],
      yardsInputString: ['']
    });

    this.loading$ = this.store.select(ScorecardSelectors.selectScorecardsLoading);
    this.currentScorecard$ = this.store.select(ScorecardSelectors.selectCurrentScorecard);
  }

  ngOnInit(): void {
    this.scorecardId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.scorecardId;

    if (this.isEditMode && this.scorecardId) {
      // Dispatch action to load scorecard
      this.store.dispatch(ScorecardActions.loadScorecard({ id: this.scorecardId }));
      
      // Subscribe to current scorecard and populate form when it changes
      this.currentScorecard$
        .pipe(takeUntil(this.destroy$))
        .subscribe(scorecard => {
          if (scorecard) {
            this.populateForm(scorecard);
          }
        });
    }
  }

  populateForm(scorecard: Scorecard): void {
    this.scorecardForm.patchValue({
      groupName: scorecard.groupName,
      name: scorecard.name,
      rating: scorecard.rating,
      slope: scorecard.slope,
      par: scorecard.par,
      parInputString: scorecard.pars ? scorecard.pars.join(',') : '',
      hCapInputString: scorecard.hCaps ? scorecard.hCaps.join(',') : '',
      yardsInputString: scorecard.yards ? scorecard.yards.join(',') : ''
    });
  }

  onSubmit(): void {
    if (this.scorecardForm.valid) {
      const formData = { ...this.scorecardForm.value };
      
      // Parse input strings into arrays
      if (formData.parInputString && formData.parInputString.trim()) {
        formData.pars = formData.parInputString.split(',').map((p: string) => parseInt(p.trim())).filter((p: number) => !isNaN(p));
      }
      if (formData.hCapInputString && formData.hCapInputString.trim()) {
        formData.hCaps = formData.hCapInputString.split(',').map((h: string) => parseInt(h.trim())).filter((h: number) => !isNaN(h));
      }
      if (formData.yardsInputString && formData.yardsInputString.trim()) {
        formData.yards = formData.yardsInputString.split(',').map((y: string) => parseInt(y.trim())).filter((y: number) => !isNaN(y));
      }

      if (this.isEditMode && this.scorecardId) {
        // Dispatch update action
        this.store.dispatch(ScorecardActions.updateScorecard({ 
          id: this.scorecardId, 
          scorecard: formData 
        }));
      } else {
        // Dispatch create action
        this.store.dispatch(ScorecardActions.createScorecard({ scorecard: formData }));
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/scorecards']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear current scorecard when leaving the form
    this.store.dispatch(ScorecardActions.clearCurrentScorecard());
  }
}