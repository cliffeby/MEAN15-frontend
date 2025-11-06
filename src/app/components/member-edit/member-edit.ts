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
import { Member } from '../../models/member';

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
    MatSnackBarModule
  ]
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
    private snackBar: MatSnackBar
  ) {
    this.memberForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      usgaIndex: [null],
      lastDatePlayed: [''],
      email: ['', [Validators.required, Validators.email]],
      user: [''],
      scorecardsId: [[]]
    });
  }

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (this.memberId) {
      this.loading = true;
      this.memberService.getById(this.memberId).subscribe({
        next: (res) => {
          this.memberForm.patchValue(res.member || res);
          this.loading = false;
        },
        error: () => {
          this.snackBar.open('Error loading member', 'Close', { duration: 2000 });
          this.loading = false;
        }
      });
    }
  }

  submit() {
    if (this.memberForm.invalid || !this.memberId) return;
    this.loading = true;
    this.memberService.update(this.memberId, this.memberForm.value).subscribe({
      next: () => {
        this.snackBar.open('Member updated!', 'Close', { duration: 2000 });
        this.router.navigate(['/members']);
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error updating member', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }
}
