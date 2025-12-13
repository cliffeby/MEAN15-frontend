import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, EventType } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit, OnDestroy {
  private msalService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  isLoggedIn = false;

  ngOnInit(): void {
    // Handle redirect response after login
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

    // Listen for login success events
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: any) => msg.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this.destroy$)
      )
      .subscribe((result: any) => {
        this.snackBar.open('Login successful!', 'Close', { duration: 2000 });
        this.router.navigate(['/dashboard']);
      });

    // Check if user is already logged in only when no interaction is in progress
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
    // Check if interaction is already in progress
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    
    this.msalService.loginRedirect({
      scopes: ['openid', 'profile', 'email', 'User.Read']
    }).subscribe({
      error: (error: any) => {
        console.error('Login redirect error:', error);
        this.isLoading = false;
        this.snackBar.open('Failed to initiate login. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  logoutWithMicrosoft(): void {
    this.msalService.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:4200'
    }).subscribe({
      next: () => {
        this.isLoggedIn = false;
        this.snackBar.open('Logged out successfully', 'Close', { duration: 2000 });
      },
      error: (error: any) => {
        console.error('Logout error:', error);
        this.snackBar.open('Logout failed', 'Close', { duration: 3000 });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
