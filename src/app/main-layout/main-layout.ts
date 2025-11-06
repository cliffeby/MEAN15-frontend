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
    MatDividerModule
  ],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss']
})
export class MainLayoutComponent {
  auth = inject(AuthService);
  router = inject(Router);

  sidebarLinks = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Loans (CRUD)', route: '/loans'},
    { label: 'Offers CRUD + NgRX)', route: '/offers'},
    { label: 'Contact Us(Template)', route: '/contact'},
    { label: 'Offers (Parent + Child)', route: '/offers/dashboard' },
  { label: 'Member List', route: '/members' },
  { label: 'Add Member', route: '/members/add' },
    { label: 'API Details', route: '/apis' },
    { label: 'Read Me', route: '/read-me' },
    { label: 'Resume Notes', route: '/resume' }
  ];

  get showUserListLink() {
    return this.auth.role === 'admin';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
