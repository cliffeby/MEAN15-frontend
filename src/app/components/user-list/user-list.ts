import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UserService } from '../../services/userService';
import { AuthService } from '../../services/authService';

@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss'],
  imports: [CommonModule, MatListModule, MatButtonModule, MatSnackBarModule, MatProgressBarModule]
})
export class UserListComponent implements OnInit {
  users: any[] = [];
  loading = false;

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  get isAdmin() {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (res) => {
        this.users = res.users || res;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error loading users', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }

  deleteUser(id: string) {
    if (!this.isAdmin) {
      this.snackBar.open('Not authorized', 'Close', { duration: 2000 });
      return;
    }
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('User deleted', 'Close', { duration: 2000 });
          this.loadUsers();
        },
        error: () => {
          this.snackBar.open('Error deleting user', 'Close', { duration: 2000 });
        }
      });
    }
  }
}
