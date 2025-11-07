import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ScoreService } from '../../services/scoreService';
import { Score } from '../../models/score';

@Component({
  selector: 'app-score-edit',
  templateUrl: './score-edit.html',
  styleUrls: ['./score-edit.scss'],
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
export class ScoreEditComponent implements OnInit {
  scoreForm: FormGroup;
  loading = false;
  scoreId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
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

  ngOnInit() {
    this.scoreId = this.route.snapshot.paramMap.get('id');
    if (this.scoreId) {
      this.loading = true;
      this.scoreService.getById(this.scoreId).subscribe({
        next: (res) => {
          const score = res.score || res;
          this.populateForm(score);
          this.loading = false;
        },
        error: () => {
          this.snackBar.open('Error loading score', 'Close', { duration: 2000 });
          this.loading = false;
        }
      });
    }
  }

  populateForm(score: Score) {
    // Clear existing arrays
    this.scoresArray.clear();
    this.scoresToPostArray.clear();

    // Populate form with score data
    this.scoreForm.patchValue({
      name: score.name,
      score: score.score,
      postedScore: score.postedScore,
      usgaIndex: score.usgaIndex,
      usgaIndexForTodaysScore: score.usgaIndexForTodaysScore,
      handicap: score.handicap,
      wonTwoBall: score.wonTwoBall,
      wonOneBall: score.wonOneBall,
      wonIndo: score.wonIndo,
      isPaired: score.isPaired,
      isScored: score.isScored,
      matchId: score.matchId,
      memberId: score.memberId,
      scorecardId: score.scorecardId,
      scSlope: score.scSlope,
      scRating: score.scRating,
      scName: score.scName,
      datePlayed: score.datePlayed ? new Date(score.datePlayed) : new Date(),
      user: score.user
    });

    // Populate arrays
    if (score.scores && Array.isArray(score.scores)) {
      score.scores.forEach(s => this.scoresArray.push(this.fb.control(s)));
    }
    if (score.scoresToPost && Array.isArray(score.scoresToPost)) {
      score.scoresToPost.forEach(s => this.scoresToPostArray.push(this.fb.control(s)));
    }
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
    if (this.scoreForm.invalid || !this.scoreId) return;
    this.loading = true;
    
    const formValue = { ...this.scoreForm.value };
    // Convert date to ISO string if it's a Date object
    if (formValue.datePlayed instanceof Date) {
      formValue.datePlayed = formValue.datePlayed.toISOString();
    }

    this.scoreService.update(this.scoreId, formValue).subscribe({
      next: () => {
        this.snackBar.open('Score updated!', 'Close', { duration: 2000 });
        this.router.navigate(['/scores']);
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error updating score', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/scores']);
  }
}