import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { ScorecardService } from '../../services/scorecardService';
import { Scorecard } from '../../models/scorecard.interface';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { SortByCourseTeeNamePipe } from '../member-form/sort-by-course-tee-name.pipe';

@Component({
  selector: 'app-member-edit',
  templateUrl: './member-edit.html',
  styleUrls: ['./member-edit.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatCheckbox,
    MatSelectModule,
    MatListModule,
    SortByCourseTeeNamePipe,
  ],
})
export class MemberEditComponent implements OnInit {
  memberForm: FormGroup;
  loading = false;
  memberId: string | null = null;
  scorecards: Scorecard[] = [];
  courseControl = new FormControl<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private memberService: MemberService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private scorecardService: ScorecardService
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

  ngOnInit() {
    this.scorecardService.getAll().subscribe((response) => {
      this.scorecards = Array.isArray(response) ? response : response.scorecards || [];
    });
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (this.memberId) {
      this.loading = true;
      this.memberService.getById(this.memberId).subscribe({
        next: (member) => {
          // Format lastDatePlayed for date input
          let patchMember = { ...member };
          if (patchMember.lastDatePlayed) {
            // Accept ISO string or Date object
            const date = typeof patchMember.lastDatePlayed === 'string'
              ? new Date(patchMember.lastDatePlayed)
              : patchMember.lastDatePlayed;
            if (!isNaN(date.getTime())) {
              // Format as YYYY-MM-DD
              patchMember.lastDatePlayed = date.toISOString().slice(0, 10);
            }
          }
          this.memberForm.patchValue(patchMember);
          // Support both [{scorecardId}] and [string] for scorecardsId
          let ids: string[] = [];
          if (Array.isArray(member.scorecardsId) && member.scorecardsId.length > 0) {
            if (typeof member.scorecardsId[0] === 'object' && member.scorecardsId[0] !== null && 'scorecardId' in member.scorecardsId[0]) {
              ids = member.scorecardsId.map((obj: any) => obj.scorecardId);
            } else {
              ids = member.scorecardsId;
            }
          }
          this.courseControl.setValue(ids);
          this.loading = false;
        },
        error: () => {
          this.snackBar.open('Error loading member', 'Close', { duration: 2000 });
          this.loading = false;
        },
      });
    }
    // Keep form and control in sync
    this.courseControl.valueChanges.subscribe((ids: string[] | null) => {
      this.memberForm.get('scorecardsId')?.setValue(ids ?? []);
    });
  }
  getCourseTeeName(scorecardIdOrObj: string | { scorecardId: string }): string {
    let id: string | undefined;
    if (typeof scorecardIdOrObj === 'string') {
      id = scorecardIdOrObj;
    } else if (scorecardIdOrObj && typeof scorecardIdOrObj === 'object' && 'scorecardId' in scorecardIdOrObj) {
      id = scorecardIdOrObj.scorecardId;
    }
    const sc = this.scorecards.find(s => s._id === id);
    return sc?.courseTeeName || 'Course';
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
    if (this.memberForm.invalid || !this.memberId) return;
    this.loading = true;
    const author = this.authService.getAuthorObject();
    // Ensure scorecardsId is always an array of objects with scorecardId property
    let memberData = { ...this.memberForm.value, author };
    if (memberData.scorecardsId && !Array.isArray(memberData.scorecardsId)) {
      memberData.scorecardsId = [memberData.scorecardsId];
    }
    if (Array.isArray(memberData.scorecardsId)) {
      // scorecardsId is an array of plain ObjectIds in the schema — send only the ID string
      memberData.scorecardsId = memberData.scorecardsId
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item._id || item.id || item.scorecardId || '';
          return '';
        })
        .filter((id: string) => !!id);
    }

    this.memberService.update(this.memberId, memberData).subscribe({
      next: () => {
        this.snackBar.open('Member updated!', 'Close', { duration: 2000 });
        this.router.navigate(['/members']);
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error updating member', 'Close', { duration: 2000 });
        this.loading = false;
      },
    });
  }
}
