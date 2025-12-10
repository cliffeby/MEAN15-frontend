import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authService';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  submit() {
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.snackBar.open('Login successful!', 'Close', { duration: 2000 });

        // Access role after token is set
        setTimeout(() => {
          const role = this.authService.role;
          console.log('User role:', role);
          if (role === 'admin' || role === 'developer') {
            this.router.navigate(['/dashboard']);
          } else if (role === 'user') {
            this.router.navigate(['/user-dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        }, 0);
      },
      error: (err) => {
        this.snackBar.open(err.error.message || 'Login failed', 'Close', { duration: 3000 });
      },
    });
  }
}
