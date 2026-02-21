import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '../../services/userService';

@Component({
  selector: 'app-invite-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Invite User</h2>
    <mat-dialog-content>
      <p class="hint">
        An invitation email will be sent via Microsoft Entra. The recipient clicks the link to
        accept and can then sign in with their existing email provider (Gmail, AOL, Yahoo, etc.).
      </p>
      <form [formGroup]="form" (ngSubmit)="submit()" id="inviteForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email address</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="off" />
          <mat-error *ngIf="form.get('email')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Enter a valid email</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Display name (optional)</mat-label>
          <input matInput formControlName="displayName" autocomplete="off" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="sending">Cancel</button>
      <button mat-raised-button color="primary" form="inviteForm" type="submit"
              [disabled]="form.invalid || sending">
        {{ sending ? 'Sending…' : 'Send Invitation' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint {
      background: #e8f4fd; color: #1565c0; border-left: 4px solid #1976d2;
      border-radius: 4px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
    }
    .full-width { width: 100%; margin-bottom: 4px; }
    mat-dialog-content { min-width: 360px; }
  `],
})
export class InviteUserDialogComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<InviteUserDialogComponent>);

  sending = false;

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: [''],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.sending = true;

    const { email, displayName } = this.form.value;
    this.userService.inviteUser(email, displayName || undefined).subscribe({
      next: (res) => {
        this.snackBar.open(res.message, 'Close', { duration: 5000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.snackBar.open(err.error?.message || 'Invitation failed.', 'Close', { duration: 5000 });
        this.sending = false;
      },
    });
  }
}
