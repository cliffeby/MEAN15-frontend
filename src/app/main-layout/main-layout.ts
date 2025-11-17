// src/app/layouts/main-layout/main-layout.component.ts
import { Component, inject } from '@angular/core';
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
  MatTooltipModule
  ],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss']
})
export class MainLayoutComponent {
  auth = inject(AuthService);
  router = inject(Router);

  sidebarLinks = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Member List', route: '/members' },
    // { label: 'Add Member', route: '/members/add' },
    { label: 'Scorecard List', route: '/scorecards' },        // Added
    // { label: 'Add Scorecard', route: '/scorecards/add' },     // Added
    { label: 'Score List', route: '/scores' },        // Added
    // { label: 'Add Score', route: '/scores/add' },     // Added
    { label: 'Match List', route: '/matches' },        // Added
    // { label: 'Add Match', route: '/matches/add' },     // Added
    { label: 'API Details', route: '/apis' },
    { label: 'Read Me', route: '/read-me' }
  ];

  get showUserListLink() {
    return this.auth.role === 'admin';
  }

  get showAdminLinks() {
    return this.auth.role === 'admin';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
