// src/app/layouts/main-layout/main-layout.component.ts
import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/authService';
import { MatSidenav } from '@angular/material/sidenav';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatSidenavModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss'],
})
export class MainLayoutComponent {
  auth = inject(AuthService);
  router = inject(Router);
  private msalService = inject(MsalService);

  @ViewChild('drawer') drawer!: MatSidenav; // Add definite assignment assertion

  isSidebarCollapsed = false;
  someCondition = true; // Add this property for conditional rendering or testing


  get sidebarLinks() {
    const links = [
      { label: 'Dashboard', route: '/dashboard' },
      { label: 'Members', route: '/members' },
      { label: 'Scorecards', route: '/scorecards' },
      { label: 'Scores', route: '/scores' },
      { label: 'HCaps', route: '/hcaps' },
      { label: 'Matches', route: '/matches' },
    ];
    if (this.auth.hasRole && this.auth.hasRole('developer')) {
      links.push({ label: 'Read Me', route: '/read-me' });
      links.push({ label: 'API Details', route: '/apis' });
    }
    return links;
  }

  get showUserListLink() {
    return this.auth.hasMinRole && this.auth.hasMinRole('admin');
  }

  get showAdminLinks() {
    return this.auth.hasMinRole && this.auth.hasMinRole('admin');
  }

  logout() {
    // MSAL logout will redirect, no need to navigate manually
    this.msalService.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:4200/login'
    });
  }

  toggleSidebar() {
    this.drawer?.toggle(); // Update this method to use the drawer reference
  }

  navigationEvent = {
    emit: (event: any) => {
      console.log('Navigation event emitted:', event);
    },
  };

  onResize() {
    console.log('Window resized');
  }
}
