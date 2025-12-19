import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { Member } from '../../models/member';
import { MatCheckbox } from '@angular/material/checkbox';

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
    MatCheckbox
  ],
})
export class MemberEditComponent implements OnInit {
  memberForm: FormGroup;
  loading = false;
  memberId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private memberService: MemberService,
    private snackBar: MatSnackBar,
    private authService: AuthService
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
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (this.memberId) {
      this.loading = true;
      this.memberService.getById(this.memberId).subscribe({
        next: (member) => {
          this.memberForm.patchValue(member);
          this.loading = false;
        },
        error: () => {
          this.snackBar.open('Error loading member', 'Close', { duration: 2000 });
          this.loading = false;
        },
      });
    }
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

  submit() {
    if (this.memberForm.invalid || !this.memberId) return;
    this.loading = true;
    const author = this.authService.getAuthorObject();
    const memberData = { ...this.memberForm.value, author };

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
