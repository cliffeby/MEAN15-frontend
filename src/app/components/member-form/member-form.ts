import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MemberService } from '../../services/memberService';

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
    MatSnackBarModule
  ]
})
export class MemberFormComponent {
  memberForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
    private snackBar: MatSnackBar
  ) {
    this.memberForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      usgaIndex: [null, [Validators.min(-10), Validators.max(54)]],
      lastDatePlayed: [''],
      Email: ['', [Validators.required, Validators.email]],
      user: [''],
      scorecardsId: [[]],
      hidden: [false]
    });
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
    if (this.memberForm.invalid) return;
    this.loading = true;
    this.memberService.create(this.memberForm.value).subscribe({
      next: () => {
        this.snackBar.open('Member created!', 'Close', { duration: 2000 });
        this.memberForm.reset();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error creating member', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }
}
