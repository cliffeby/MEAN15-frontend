import { Component, OnInit } from '@angular/core';
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
import { ScorecardService } from '../../services/scorecard';

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
export class ScorecardFormComponent implements OnInit {
  scorecardForm: FormGroup;
  isEditMode = false;
  scorecardId: string | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private scorecardService: ScorecardService,
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
      user: ['', [Validators.required, Validators.minLength(2)]],
      parInputString: [''],
      hCapInputString: [''],
      yardsInputString: ['']
    });
  }

  ngOnInit(): void {
    this.scorecardId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.scorecardId;

    if (this.isEditMode && this.scorecardId) {
      this.loadScorecard(this.scorecardId);
    }
  }

  loadScorecard(id: string): void {
    this.loading = true;
    this.scorecardService.getById(id).subscribe({
      next: (response) => {
        const scorecard = response.scorecard || response;
        this.scorecardForm.patchValue({
          groupName: scorecard.groupName,
          name: scorecard.name,
          rating: scorecard.rating,
          slope: scorecard.slope,
          par: scorecard.par,
          user: scorecard.user,
          parInputString: scorecard.pars ? scorecard.pars.join(',') : '',
          hCapInputString: scorecard.hCaps ? scorecard.hCaps.join(',') : '',
          yardsInputString: scorecard.yards ? scorecard.yards.join(',') : ''
        });
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open('Error loading scorecard: ' + error.message, 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.scorecardForm.valid) {
      this.loading = true;
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
        this.updateScorecard(formData);
      } else {
        this.createScorecard(formData);
      }
    }
  }

  createScorecard(formData: any): void {
    this.scorecardService.create(formData).subscribe({
      next: (response) => {
        this.snackBar.open('Scorecard created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/scorecards']);
      },
      error: (error) => {
        this.snackBar.open('Error creating scorecard: ' + error.message, 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  updateScorecard(formData: any): void {
    this.scorecardService.update(this.scorecardId!, formData).subscribe({
      next: (response) => {
        this.snackBar.open('Scorecard updated successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/scorecards']);
      },
      error: (error) => {
        this.snackBar.open('Error updating scorecard: ' + error.message, 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/scorecards']);
  }
}