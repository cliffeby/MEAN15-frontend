import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/authService';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatIconModule, MatDividerModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  // Registration only requires name and email.
  // Role is always 'user'; a temporary password is assigned server-side.
  registerForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  submitting = false;

  submit() {
    if (this.registerForm.invalid) return;
    this.submitting = true;

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open(
          'Account created. Log in with the temporary password provided by your administrator.',
          'Close',
          { duration: 6000 }
        );
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.submitting = false;
        this.snackBar.open(err.message || 'Registration failed', 'Close', { duration: 4000 });
      }
    });
  }
}
