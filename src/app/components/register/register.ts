import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule,MatSelectModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  fb = inject(FormBuilder);
  authService = inject(Auth);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  registerForm: FormGroup;

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['customer', Validators.required] // default to customer
    });
  }

  submit() {
    if (this.registerForm.invalid) return;

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.snackBar.open('Registration successful!', 'Close', { duration: 2000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.snackBar.open(err.error.message || 'Registration failed', 'Close', { duration: 3000 });
      }
    });
  }
}
