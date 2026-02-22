import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Invite User</h2>
    <mat-dialog-content>

      <!-- Success state: show redeem URL -->
      @if (redeemUrl) {
        <p class="success-msg">
          <mat-icon class="success-icon">check_circle</mat-icon>
          Account created and welcome email sent to <strong>{{ sentEmail }}</strong>.
        </p>
      }

      <!-- Form state -->
      @if (!redeemUrl) {
        <p class="hint">
          A local account will be created with a temporary password and a welcome email will be
          sent to the address below. The user must change their password on first login.
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
      }

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (redeemUrl) {
        <button mat-raised-button color="primary" [mat-dialog-close]="true">Done</button>
      } @else {
        <button mat-button mat-dialog-close [disabled]="sending">Cancel</button>
        <button mat-raised-button color="primary" form="inviteForm" type="submit"
                [disabled]="form.invalid || sending">
          {{ sending ? 'Sending…' : 'Send Invitation' }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .hint {
      background: #e8f4fd; color: #1565c0; border-left: 4px solid #1976d2;
      border-radius: 4px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
    }
    .success-msg {
      display: flex; align-items: center; gap: 8px;
      color: #2e7d32; font-size: 14px; margin-bottom: 8px;
    }
    .success-icon { color: #2e7d32; font-size: 20px; width: 20px; height: 20px; }
    .url-box {
      display: flex; align-items: center; gap: 4px;
      background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px;
      padding: 8px 12px; margin-top: 4px;
    }
    .url-text {
      flex: 1; font-size: 12px; word-break: break-all;
      color: #333; font-family: monospace;
    }
    .full-width { width: 100%; margin-bottom: 4px; }
    mat-dialog-content { min-width: 380px; }
  `],
})
export class InviteUserDialogComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<InviteUserDialogComponent>);

  sending = false;
  redeemUrl: string | null = null;
  sentEmail = '';
  copied = false;

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
        this.sending = false;
        this.sentEmail = email;
        this.redeemUrl = res.inviteRedeemUrl || null;
        if (!this.redeemUrl) {
          // No URL returned — just close with a snackbar
          this.snackBar.open(res.message, 'Close', { duration: 5000 });
          this.dialogRef.close(true);
        }
      },
      error: (err: any) => {
        this.snackBar.open(err.error?.message || 'Invitation failed.', 'Close', { duration: 5000 });
        this.sending = false;
      },
    });
  }

  onCopied(_success: boolean): void {
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }
}
