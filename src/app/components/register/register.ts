
// ...existing code removed...
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authService';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MsalBroadcastService } from '@azure/msal-angular';
import { MsalModule } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, 
    MatFormFieldModule, MatInputModule, MatButtonModule, 
    MatSnackBarModule, MatSelectModule, MatIconModule, MsalModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);
  snackBar = inject(MatSnackBar);
  msalBroadcastService = inject(MsalBroadcastService);

  registerForm: FormGroup;
  msalInProgress = false;

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['user', Validators.required]
    });

    // Subscribe to MSAL interaction status
    this.msalBroadcastService.inProgress$.subscribe(status => {
      this.msalInProgress = status !== InteractionStatus.None;
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
    get currentAccount() {
    const msalService = this.authService.getMsalService();
    if (!msalService || !msalService.instance) {
      return null;
    }
    const accounts = msalService.instance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  signUpWithGoogle() {
    this.msalBroadcastService.inProgress$
      .pipe(take(1))
      .subscribe(status => {
        if (status === InteractionStatus.None) {
          // idp parameter for Google (Entra External ID)
          this.authService.getMsalService().loginRedirect({
            scopes: ['openid', 'profile', 'email'],
            extraQueryParameters: {
              idp: 'Google',
              prompt: 'select_account'
            }
          });
        } else {
          this.snackBar.open('Authentication is already in progress. Please wait.', 'Close', { duration: 2000 });
        }
      });
  }
}
