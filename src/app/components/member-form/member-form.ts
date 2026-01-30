import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormArray, FormControl } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { ScorecardService } from '../../services/scorecardService';
import { Scorecard } from '../../models/scorecard.interface';
import { SortByCourseTeeNamePipe } from './sort-by-course-tee-name.pipe';

@Component({
  selector: 'app-member-form',
  templateUrl: './member-form.html',
  styleUrls: ['./member-form.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatSelectModule,
    MatListModule,
    SortByCourseTeeNamePipe,
  ],
})
export class MemberFormComponent implements OnInit {
  memberForm: FormGroup;
  loading = false;
  scorecards: Scorecard[] = [];
  sortedScorecards: Scorecard[] = [];
  courseControl = new FormControl<string[]>([]);
  teeControl = new FormControl('');
  defaultCourseTees: { scorecardId: string }[] = [];
  selectedScorecardId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private scorecardService: ScorecardService,
  ) {
    this.memberForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      usgaIndex: [null, [Validators.min(-10), Validators.max(54)]],
      lastDatePlayed: [''],
      Email: ['', [Validators.required, Validators.email]],
      scorecardsId: [[]],
      hidden: [false],
    });
  }

  ngOnInit(): void {
    this.scorecardService.getAll().subscribe((response) => {
      this.scorecards = Array.isArray(response) ? response : response.scorecards || [];
      this.sortedScorecards = [...this.scorecards].sort((a, b) => {
        const aName = (a.courseTeeName || '').toLowerCase();
        const bName = (b.courseTeeName || '').toLowerCase();
        return aName.localeCompare(bName);
      });
    });
    // Sync courseControl with saved scorecardsId on init
    const saved = this.memberForm.get('scorecardsId')?.value;
    if (Array.isArray(saved) && saved.length > 0) {
      this.courseControl.setValue(saved);
    }
    // Keep form and control in sync
    this.courseControl.valueChanges.subscribe((ids: string[] | null) => {
      this.memberForm.get('scorecardsId')?.setValue(ids ?? []);
    });
  }

  get availableTees(): string[] {
    const scorecard = this.scorecards.find((sc) => sc._id === this.selectedScorecardId);
    return scorecard && scorecard.tees ? scorecard.tees.split(',').map((t) => t.trim()) : [];
  }
  get scorecardsId(): FormArray {
    return this.memberForm.get('scorecardsId') as FormArray;
  }

  getCourseTeeName(scorecardId: string): string {
    const sc = this.scorecards.find((s) => s._id === scorecardId);
    return sc?.courseTeeName || 'Course';
  }

  addCourseTee() {
    const scorecardIds = this.courseControl.value;
    if (Array.isArray(scorecardIds)) {
      scorecardIds.forEach((scorecardId) => {
        if (!this.defaultCourseTees.some((e) => e.scorecardId === scorecardId)) {
          this.defaultCourseTees.push({ scorecardId });
        }
      });
      this.courseControl.setValue([]);
    }
  }

  removeCourseTee(index: number) {
    this.defaultCourseTees.splice(index, 1);
  }

  // Getter methods for form validation
  get usgaIndexControl() {
    return this.memberForm.get('usgaIndex');
  }

  get isUsgaIndexMinError(): boolean {
    return !!(this.usgaIndexControl?.hasError('min') && this.usgaIndexControl?.touched);
  }

  get isUsgaIndexMaxError(): boolean {
    return !!(this.usgaIndexControl?.hasError('max') && this.usgaIndexControl?.touched);
  }
  courseHover = false;

  onCourseMouseOver(select: any) {
    this.courseHover = true;
    select.open();
  }

  onCourseMouseLeave(select: any) {
    this.courseHover = false;
    setTimeout(() => {
      if (!this.courseHover) {
        select.close();
      }
    }, 150);
  }
  onDropdownOpened(opened: boolean, select: any) {
    if (opened) {
      setTimeout(() => {
        const panel = document.querySelector('.hover-panel');
        if (panel) {
          panel.addEventListener('mouseleave', () => select.close(), { once: true });
        }
      }, 0);
    }
  }
  submit() {
    if (this.memberForm.invalid) return;
    this.loading = true;
    const author = this.authService.getAuthorObject();
    const memberData = { ...this.memberForm.value, author };

    this.memberService.create(memberData).subscribe({
      next: () => {
        this.snackBar.open('Member created!', 'Close', { duration: 2000 });
        this.memberForm.reset();
        this.defaultCourseTees = [];
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error creating member', 'Close', { duration: 2000 });
        this.loading = false;
      },
    });
  }
}
