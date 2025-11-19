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
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MemberService } from '../../services/memberService';
import { Member } from '../../models/member';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { UserPreferencesService, ColumnPreference } from '../../services/user-preferences.service';

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
    MatMenuModule,
    MatCheckboxModule,
    MatTooltipModule,
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
  allColumns: Array<{ key: string; label: string; visible: boolean; fixed?: boolean }> = [];

  get displayedColumns(): string[] {
    return this.allColumns.filter(col => col.visible).map(col => col.key);
  }

  constructor(
    private memberService: MemberService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService,
    private preferencesService: UserPreferencesService
  ) {}
  get isAdmin(): boolean {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    this.initializeColumns();
    this.loadMembers();
  }

  private initializeColumns() {
    // Load saved preferences
    const savedPreferences = this.preferencesService.getMemberListColumnPreferences();
    
    // Create default column configuration
    const defaultColumns = [
      { key: 'fullName', label: 'Name', visible: true },
  { key: 'Email', label: 'Email', visible: true },
      { key: 'usgaIndex', label: 'USGA Index', visible: true },
      { key: 'lastDatePlayed', label: 'Last Played', visible: true },
      { key: 'actions', label: 'Actions', visible: true, fixed: true }
    ];

    // Merge saved preferences with default columns
    this.allColumns = defaultColumns.map(defaultCol => {
      const savedCol = savedPreferences.find(saved => saved.key === defaultCol.key);
      return {
        ...defaultCol,
        visible: defaultCol.fixed ? true : (savedCol ? savedCol.visible : defaultCol.visible)
      };
    });
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
        // console.log('Error handler reached in loadMembers');
        // console.log('SnackBar instance in component:', this.snackBar);
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
  const email = (member.Email || '').toLowerCase();
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
        case 'Email':
          aValue = (a.Email || '').toLowerCase();
          bValue = (b.Email || '').toLowerCase();
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
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to edit members.', 'Close', { duration: 2500 });
      return;
    }
    this.router.navigate(['/members/edit', id]);
  }

  addMember() {
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to add members.', 'Close', { duration: 2500 });
      return;
    }
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

  toggleColumnVisibility(columnKey: string) {
    const column = this.allColumns.find(col => col.key === columnKey);
    if (column && !column.fixed) {
      // Prevent hiding all data columns (keep at least one visible)
      const visibleDataColumns = this.allColumns.filter(col => col.visible && !col.fixed).length;
      if (column.visible && visibleDataColumns <= 1) {
        this.snackBar.open('At least one data column must remain visible', 'Close', { duration: 2000 });
        return;
      }
      column.visible = !column.visible;
      this.saveColumnPreferences();
    }
  }

  isColumnVisible(columnKey: string): boolean {
    const column = this.allColumns.find(col => col.key === columnKey);
    return column ? column.visible : false;
  }

  getVisibleColumnsCount(): number {
    return this.allColumns.filter(col => col.visible).length;
  }

  hasCustomPreferences(): boolean {
    // Check if current settings differ from defaults
    const defaultColumns = [
      { key: 'fullName', visible: true },
      { key: 'Email', visible: true },
      { key: 'usgaIndex', visible: true },
      { key: 'lastDatePlayed', visible: true }
    ];

    return defaultColumns.some(defaultCol => {
      const currentCol = this.allColumns.find(col => col.key === defaultCol.key);
      return currentCol && currentCol.visible !== defaultCol.visible;
    });
  }

  resetColumns() {
    this.allColumns.forEach(column => {
      column.visible = true;
    });
    this.saveColumnPreferences();
  }

  private saveColumnPreferences() {
    // Only save preferences for non-fixed columns
    const preferences: ColumnPreference[] = this.allColumns
      .filter(col => !col.fixed)
      .map(col => ({ key: col.key, visible: col.visible }));
    
    this.preferencesService.saveMemberListColumnPreferences(preferences);
  }

  clearAllPreferences() {
    this.confirmDialog.confirmAction(
      'Reset All Preferences', 
      'This will reset all your column preferences to default settings. Are you sure?',
      'Reset',
      'Cancel'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.preferencesService.clearUserPreferences();
        this.initializeColumns(); // Reload with defaults
        this.snackBar.open('All preferences have been reset to defaults', 'Close', { duration: 3000 });
      }
    });
  }

  removeDuplicateEmails() {
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to remove duplicates.', 'Close', { duration: 2500 });
      return;
    }

    this.confirmDialog.confirmAction(
      'Remove Duplicate Emails', 
      'This will permanently delete members with duplicate email addresses, keeping only the oldest member for each email. This action cannot be undone.',
      'Remove Duplicates',
      'Cancel'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.memberService.removeDuplicateEmails().subscribe({
          next: (response) => {
            if (response.deletedCount > 0) {
              this.snackBar.open(`Removed ${response.deletedCount} duplicate members`, 'Close', { duration: 4000 });
              this.loadMembers(); // Refresh the list
            } else {
              this.snackBar.open('No duplicate email addresses found', 'Close', { duration: 3000 });
            }
          },
          error: (err) => {
            if (err.status === 403 || err.status === 401) {
              this.snackBar.open('You are not authorized to remove duplicates.', 'Close', { duration: 2500 });
            } else {
              this.snackBar.open('Error removing duplicates', 'Close', { duration: 3000 });
            }
          }
        });
      }
    });
  }
}
