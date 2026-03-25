import { Component, OnInit, AfterViewInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { UserService } from '../../services/userService';
import { AuthService } from '../../services/authService';
import { InviteUserDialogComponent } from '../invite-user/invite-user-dialog';

@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    FormsModule,
  ]
})
export class UserListComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<any>([]);
  searchTerm = '';
  loading = false;

  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) this.dataSource.sort = sort;
  }

  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  readonly roles = ['user', 'fieldhand', 'admin', 'developer'];
  readonly displayedColumns = ['name', 'email', 'role', 'actions'];

  get isAdmin() {
    return this.authService.hasMinRole('admin');
  }

  get canChangeRole() {
    return this.authService.hasMinRole('admin');
  }

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.filterPredicate = (user, filter) => {
      const term = filter.toLowerCase();
      return (
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
      );
    };
  }

  applyFilter() {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (res) => {
        this.dataSource.data = res.users || res;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error loading users', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }

  openInviteDialog(): void {
    this.dialog
      .open(InviteUserDialogComponent, { width: '500px' })
      .afterClosed()
      .subscribe((sent) => {
        if (sent) this.loadUsers();
      });
  }

  updateRole(user: any, newRole: string) {
    if (!this.canChangeRole) return;
    this.userService.updateRole(user._id, newRole).subscribe({
      next: (res) => {
        user.role = res.user.role;
        this.snackBar.open(`Role updated to ${newRole}`, 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Error updating role', 'Close', { duration: 2000 });
        this.loadUsers(); // reload to reset dropdown
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
