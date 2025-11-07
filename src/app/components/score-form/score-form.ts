import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { ScoreService } from '../../services/scoreService';

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
    MatSnackBarModule
  ]
})
export class ScoreFormComponent {
  scoreForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private scoreService: ScoreService,
    private snackBar: MatSnackBar
  ) {
    this.scoreForm = this.fb.group({
      name: ['', Validators.required],
      score: [null, [Validators.required, Validators.min(0)]],
      postedScore: [null, [Validators.required, Validators.min(0)]],
      scores: this.fb.array([]),
      scoresToPost: this.fb.array([]),
      usgaIndex: [null],
      usgaIndexForTodaysScore: [null],
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
      partnerIds: this.fb.array([]),
      user: ['', Validators.required]
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

  submit() {
    if (this.scoreForm.invalid) return;
    this.loading = true;
    
    const formValue = { ...this.scoreForm.value };
    // Convert date to ISO string if it's a Date object
    if (formValue.datePlayed instanceof Date) {
      formValue.datePlayed = formValue.datePlayed.toISOString();
    }

    this.scoreService.create(formValue).subscribe({
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
}