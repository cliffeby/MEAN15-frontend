import { Component, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MemberService } from '../../services/memberService';
import { Member } from '../../models/member';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-member-list',
  templateUrl: './member-list.html',
  styleUrls: ['./member-list.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    FormsModule
  ]
})
export class MemberListComponent implements OnInit {
  members: Member[] = [];
  filteredMembers: Member[] = [];
  loading = false;
  
  // Filter properties
  searchTerm = '';
  sortField = 'firstName';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Table configuration
  displayedColumns: string[] = ['fullName', 'email', 'usgaIndex', 'lastDatePlayed', 'actions'];

  constructor(
    private memberService: MemberService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService
  ) {}
  get isAdmin(): boolean {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    this.loading = true;
    this.memberService.getAll().subscribe({
      next: (members) => {
        console.log('Members loaded:', members);    
        this.members = members;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error loading members', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }

  applyFilter() {
    let filtered = [...this.members];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(member => {
        const fullName = (member.fullName || `${member.firstName} ${member.lastName || ''}`.trim()).toLowerCase();
        const email = (member.email || '').toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'fullName':
          aValue = (a.fullName || `${a.firstName} ${a.lastName || ''}`.trim()).toLowerCase();
          bValue = (b.fullName || `${b.firstName} ${b.lastName || ''}`.trim()).toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'usgaIndex':
          aValue = a.usgaIndex || 0;
          bValue = b.usgaIndex || 0;
          break;
        case 'lastDatePlayed':
          aValue = a.lastDatePlayed ? new Date(a.lastDatePlayed) : new Date(0);
          bValue = b.lastDatePlayed ? new Date(b.lastDatePlayed) : new Date(0);
          break;
        default:
          aValue = a.firstName.toLowerCase();
          bValue = b.firstName.toLowerCase();
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredMembers = filtered;
  }

  onSearchChange() {
    this.applyFilter();
  }

  sortData(sort: Sort) {
    this.sortField = sort.active;
    this.sortDirection = sort.direction as 'asc' | 'desc' || 'asc';
    this.applyFilter();
  }

  editMember(id: string) {
    this.router.navigate(['/members/edit', id]);
  }

  addMember() {
    this.router.navigate(['/members/add']);
  }

  deleteMember(id: string) {
    if (!id) return;
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to delete members.', 'Close', { duration: 2500 });
      return;
    }

    // Find the member to get their name for the confirmation dialog
    const member = this.members.find(m => m._id === id);
    const memberName = member ? `${member.firstName} ${member.lastName}`.trim() : `Member ${id}`;
    
    this.confirmDialog.confirmDelete(memberName, 'member').subscribe(confirmed => {
      if (confirmed) {
        this.memberService.delete(id).subscribe({
          next: () => {
            this.snackBar.open('Member deleted', 'Close', { duration: 2000 });
            this.loadMembers();
          },
          error: (err) => {
            if (err.status === 403 || err.status === 401) {
              this.snackBar.open('You are not authorized to delete members.', 'Close', { duration: 2500 });
            } else {
              this.snackBar.open('Error deleting member', 'Close', { duration: 2000 });
            }
          }
        });
      }
    });
  }
}
