// src/app/layouts/main-layout/main-layout.component.ts
import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
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
    MatBadgeModule,
  ],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss'],
})
export class MainLayoutComponent implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);
  private msalService = inject(MsalService);

  @ViewChild('drawer') drawer!: MatSidenav;

  isSidebarCollapsed = false;
  someCondition = true;

  /** True when the user is authenticated but has no App Roles assigned yet. */
  readonly pendingApproval = signal(false);

  ngOnInit(): void {
    // JIT provisioning — fires once per browser session to create/verify the local
    // User record. Guarded by sessionStorage so it only runs once per tab session.
    if (!sessionStorage.getItem('provisioned') && this.auth.isLoggedIn()) {
      this.auth.provision().subscribe({
        next: () => {
          sessionStorage.setItem('provisioned', '1');
          // Surface a banner if the user has no assigned roles yet
          const roles = this.auth.getRoles();
          this.pendingApproval.set(!roles || roles.length === 0);
        },
        error: (err) => {
          console.warn('Provision call failed (non-fatal):', err);
        },
      });
    } else {
      // Already provisioned this session — just check role state
      const roles = this.auth.getRoles();
      this.pendingApproval.set(!!this.auth.isLoggedIn() && (!roles || roles.length === 0));
    }
  }

  get sidebarLinks() {
    const links = [
      { label: 'Dashboard', route: '/dashboard' },
      { label: 'Members', route: '/members' },
      { label: 'Scorecards', route: '/scorecards' },
      { label: 'Scores', route: '/scores' },
      { label: 'HCaps', route: '/hcaps' },
      { label: 'Matches', route: '/matches' },
      { label: 'Reports', route: '/reports' }, // <-- Add Reports option
    ];
    if (this.auth.hasRole && this.auth.hasRole('developer')) {
      links.push({ label: 'Read Me', route: '/read-me' });
    }
    if (this.auth.hasMinRole && this.auth.hasMinRole('admin')) {
      links.push({ label: 'Email', route: '/email' });
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
    sessionStorage.removeItem('provisioned');
    this.msalService.logoutRedirect({
      postLogoutRedirectUri: 'https://brave-tree-00ac3970f.1.azurestaticapps.net//login'
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
