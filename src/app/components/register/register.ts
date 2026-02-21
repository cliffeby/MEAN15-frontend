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
import { MsalBroadcastService } from '@azure/msal-angular';
import { MsalModule } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatIconModule, MatDividerModule, MsalModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);
  msalBroadcastService = inject(MsalBroadcastService);

  // Registration only requires name and email.
  // Role is always 'user'; a temporary password is assigned server-side.
  registerForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  msalInProgress = false;
  submitting = false;

  constructor() {
    this.msalBroadcastService.inProgress$.subscribe(status => {
      this.msalInProgress = status !== InteractionStatus.None;
    });
  }

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

  signUpWithMicrosoft() {
    this.msalBroadcastService.inProgress$
      .pipe(take(1))
      .subscribe(status => {
        if (status === InteractionStatus.None) {
          this.authService.getMsalService().loginRedirect({
            scopes: ['openid', 'profile', 'email'],
            extraQueryParameters: { prompt: 'select_account' }
          });
        } else {
          this.snackBar.open('Authentication is already in progress. Please wait.', 'Close', { duration: 2000 });
        }
      });
  }
}
