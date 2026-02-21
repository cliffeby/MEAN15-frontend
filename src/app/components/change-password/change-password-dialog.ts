import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/authService';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password-dialog',
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
    <h2 mat-dialog-title>Change Your Password</h2>
    <mat-dialog-content>
      <p class="hint">
        Your account uses a temporary password. Please set a permanent password before continuing.
      </p>
      <form [formGroup]="form" (ngSubmit)="submit()" id="cpForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Current (temporary) password</mat-label>
          <input matInput [type]="hideCurrent ? 'password' : 'text'" formControlName="currentPassword" />
          <button type="button" mat-icon-button matSuffix (click)="hideCurrent = !hideCurrent">
            <mat-icon>{{ hideCurrent ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-error *ngIf="form.get('currentPassword')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" formGroupName="passwords">
          <mat-label>New password</mat-label>
          <input matInput [type]="hideNew ? 'password' : 'text'" formControlName="newPassword" />
          <button type="button" mat-icon-button matSuffix (click)="hideNew = !hideNew">
            <mat-icon>{{ hideNew ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-error *ngIf="form.get('passwords.newPassword')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('passwords.newPassword')?.hasError('minlength')">Minimum 8 characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" formGroupName="passwords">
          <mat-label>Confirm new password</mat-label>
          <input matInput type="password" formControlName="confirmPassword" />
          <mat-error *ngIf="form.get('passwords')?.hasError('mismatch')">Passwords do not match</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving">Cancel</button>
      <button mat-raised-button color="primary" form="cpForm" type="submit" [disabled]="saving || form.invalid">
        {{ saving ? 'Saving…' : 'Set New Password' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { color: #856404; background: #fff3cd; border-radius: 4px; padding: 8px 12px; font-size: 13px; margin-bottom: 12px; }
    .full-width { width: 100%; margin-bottom: 4px; }
    mat-dialog-content { min-width: 340px; }
  `],
})
export class ChangePasswordDialogComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);

  hideCurrent = true;
  hideNew = true;
  saving = false;

  form: FormGroup = this.fb.group({
    currentPassword: ['', Validators.required],
    passwords: this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordsMatch }
    ),
  });

  submit(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const currentPassword = this.form.get('currentPassword')!.value;
    const newPassword = this.form.get('passwords.newPassword')!.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.snackBar.open('Password updated successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.snackBar.open(err.message, 'Close', { duration: 4000 });
        this.saving = false;
      },
    });
  }
}
