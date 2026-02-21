import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, EventType } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
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
    MatDividerModule,
    MatDialogModule,
    RouterModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit, OnDestroy {
  private msalService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  isLoading = false;
  isLocalLoading = false;
  isLoggedIn = false;
  hidePassword = true;

  localLoginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    this.msalService.instance.handleRedirectPromise()
      .then((response) => {
        if (response) {
          this.snackBar.open('Login successful!', 'Close', { duration: 2000 });
          this.router.navigate(['/dashboard']);
        }
      })
      .catch((error) => {
        console.error('Login error:', error);
        this.snackBar.open('Login failed. Please try again.', 'Close', { duration: 3000 });
      });

    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: any) => msg.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.snackBar.open('Login successful!', 'Close', { duration: 2000 });
        this.router.navigate(['/dashboard']);
      });

    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const accounts = this.msalService.instance.getAllAccounts();
        if (accounts.length > 0) {
          this.isLoggedIn = true;
          this.router.navigate(['/dashboard']);
        } else {
          this.isLoggedIn = false;
        }
      });
  }

  loginWithMicrosoft(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.msalService.loginRedirect({
      scopes: ['openid', 'profile', 'email', 'User.Read'],
    }).subscribe({
      error: (error: any) => {
        console.error('Login redirect error:', error);
        this.isLoading = false;
        this.snackBar.open('Failed to initiate login. Please try again.', 'Close', { duration: 3000 });
      },
    });
  }

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

  logoutWithMicrosoft(): void {
    this.isLoggedIn = false;
    this.msalService.logoutRedirect({ postLogoutRedirectUri: environment.postLogoutRedirectUri });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
