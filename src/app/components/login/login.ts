import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/authService';
import { ChangePasswordDialogComponent } from '../change-password/change-password-dialog';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDialogModule,
    RouterModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  isLocalLoading = false;
  hidePassword = true;

  localLoginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  localLogin(): void {
    if (this.localLoginForm.invalid) return;
    this.isLocalLoading = true;

    const { email, password } = this.localLoginForm.value;
    this.authService.localLogin(email, password).subscribe({
      next: (res) => {
        this.isLocalLoading = false;
        if (res.mustChangePassword) {
          // Token is stored; now force password change before entering the app
          this.dialog
            .open(ChangePasswordDialogComponent, { disableClose: true, width: '400px' })
            .afterClosed()
            .subscribe(() => this.router.navigate(['/dashboard']));
        } else {
          this.snackBar.open('Login successful!', 'Close', { duration: 2000 });
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: Error) => {
        this.isLocalLoading = false;
        this.snackBar.open(err.message, 'Close', { duration: 4000 });
      },
    });
  }

}
