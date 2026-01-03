import { Component, OnInit, ViewChild, AfterViewInit, HostBinding, OnDestroy } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
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
import { ConfigurationService } from '../../services/configuration.service';
import { Subscription } from 'rxjs';

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
    FormsModule,
    MatPaginatorModule,
  ],
})
export class MemberListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  members: Member[] = [];
  filteredMembers: Member[] = [];
  pagedMembers: Member[] = [];
  loading = false;

  // Pagination
  pageSize = 20;
  pageSizeOptions: number[] = [10, 20, 50, 100];

  @HostBinding('class.dark-theme')
  isDarkTheme = false;

  // Filter properties
  searchTerm = '';
  sortField = 'firstName';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Table configuration
  allColumns: Array<{ key: string; label: string; visible: boolean; fixed?: boolean }> = [];

  // Add a property to track hidden members toggle state
  showHiddenMembers = false;

  private configSub: Subscription | null = null;
  private mqListener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null = null;

  get displayedColumns(): string[] {
    return this.allColumns.filter((col) => col.visible).map((col) => col.key);
  }

  constructor(
    private memberService: MemberService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService,
    private preferencesService: UserPreferencesService,
    private configService: ConfigurationService
  ) {}


  get isAuthorized(): boolean {
    return this.authService.hasMinRole('fieldhand');
  }
  get isAuthorizedToDelete(): boolean {
    return this.authService.hasMinRole('admin');
  }
    get author(): any | null {
    return this.authService.getAuthorObject();
  }

  ngOnInit() {
    // Load pagination config from configuration
    const displayConfig = this.configService.displayConfig();
    const paginationConfig = this.configService.paginationConfig();
    this.pageSize = displayConfig.memberListPageSize;
    this.pageSizeOptions = paginationConfig.pageSizeOptions;

    this.sortField = 'lastName'; // Set initial sort field to lastName
    this.sortDirection = 'asc'; // Set initial sort direction to ascending
    this.initializeColumns();
    this.loadMembers();
    // Apply theme from configuration and listen for changes
    try {
      const ui = this.configService.uiConfig();
      this.applyTheme(ui.theme);
    } catch (e) {
      // ignore in test environments if signals are unavailable
    }

    this.configSub = this.configService.config$.subscribe((cfg) => {
      this.applyTheme(cfg.ui.theme);
    });
  }

  ngAfterViewInit() {
    // Paginator is inside *ngIf so it won't be available here
    // Subscription is set up in loadMembers after data loads
  }

  ngOnDestroy(): void {
    if (this.configSub) {
      this.configSub.unsubscribe();
      this.configSub = null;
    }
    if (this.mqListener && typeof window !== 'undefined' && (window as any).matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.removeEventListener('change', this.mqListener);
      this.mqListener = null;
    }
  }

  private applyTheme(theme: string) {
    // theme: 'auto' | 'light' | 'dark'
    if (!theme) theme = 'auto';
    if (theme === 'dark') {
      this.setDark(true);
    } else if (theme === 'light') {
      this.setDark(false);
    } else {
      // auto: follow system preference
      if (typeof window !== 'undefined' && (window as any).matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        this.setDark(!!mq.matches);
        // remove previous listener
        if (this.mqListener) {
          mq.removeEventListener('change', this.mqListener);
        }
        this.mqListener = (e: MediaQueryListEvent) => this.setDark(!!e.matches);
        mq.addEventListener('change', this.mqListener);
      } else {
        this.setDark(false);
      }
    }
  }

  private setDark(val: boolean) {
    this.isDarkTheme = !!val;
  }

  private initializeColumns() {
    // Load saved preferences
    const savedPreferences = this.preferencesService.getMemberListColumnPreferences();

    // Create default column configuration
    const defaultColumns = [
      { key: 'fullName', label: 'Name', visible: true },
      { key: 'Email', label: 'Email', visible: true },
      { key: 'usgaIndex', label: 'USGA Index', visible: true },
      { key: 'GHIN', label: 'GHIN', visible: true },
      { key: 'handicap', label: 'Handicap', visible: true },
      { key: 'lastDatePlayed', label: 'Last Played', visible: true },
      { key: 'hidden', label: 'Hidden', visible: false },
      { key: 'actions', label: 'Actions', visible: true, fixed: true },
    ];

    // Merge saved preferences with default columns
    this.allColumns = defaultColumns.map((defaultCol) => {
      const savedCol = savedPreferences.find((saved) => saved.key === defaultCol.key);
      return {
        ...defaultCol,
        visible: defaultCol.fixed ? true : savedCol ? savedCol.visible : defaultCol.visible,
      };
    });
  }

  loadMembers() {
    this.loading = true;
    this.memberService.getAll().subscribe({
      next: (members) => {
        console.log('Members loaded:', members);
        // Use the handicap value as provided by the backend (do not calculate or override)
        this.members = members || [];
        this.applyFilter();
        this.loading = false;
        // Set up paginator after view renders
        setTimeout(() => {
          if (this.paginator) {
            this.paginator.page.subscribe(() => {
              console.log('Paginator page event fired');
              this.updatePagedMembers();
            });
            this.updatePagedMembers();
          }
        }, 0);
      },
      error: () => {
        // console.log('Error handler reached in loadMembers');
        // console.log('SnackBar instance in component:', this.snackBar);
        this.snackBar.open('Error loading members', 'Close', { duration: 2000 });
        this.loading = false;
      },
    });
  }

  applyFilter() {
    let filtered = [...this.members];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter((member) => {
        const fullName = (
          member.fullName || `${member.firstName} ${member.lastName || ''}`.trim()
        ).toLowerCase();
        const email = (member.Email || '').toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Only show hidden members if the hidden column is visible
    const hiddenColumnVisible = this.allColumns.some((col) => col.key === 'hidden' && col.visible);
    console.log('Hidden column visible:', hiddenColumnVisible);
    if (!hiddenColumnVisible) {
      filtered = filtered.filter((member) => !member.hidden);
    }

    // Include hidden members if the toggle is active
    if (this.showHiddenMembers) {
      filtered = filtered.filter((member) => member.hidden);
    }

    console.log('Filtered members:', filtered);

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'lastName':
          aValue = (a.lastName || '').toLowerCase();
          bValue = (b.lastName || '').toLowerCase();
          break;
        case 'fullName':
          // Sort by last name primarily, then first name to keep name-sorts consistent
          const aLast = (a.lastName || '').toLowerCase();
          const bLast = (b.lastName || '').toLowerCase();
          const aFirst = (a.firstName || '').toLowerCase();
          const bFirst = (b.firstName || '').toLowerCase();
          aValue = `${aLast} ${aFirst}`.trim();
          bValue = `${bLast} ${bFirst}`.trim();
          break;
        case 'GHIN':
          aValue = (a as any).GHIN || '';
          bValue = (b as any).GHIN || '';
          break;
        case 'handicap':
          aValue = (a as any).handicap || 0;
          bValue = (b as any).handicap || 0;
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
          // Default to lastName sort to keep name ordering consistent across the table
          aValue = (a.lastName || '').toLowerCase();
          bValue = (b.lastName || '').toLowerCase();
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredMembers = filtered;

    // Reset to first page when filter changes
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.updatePagedMembers();
  }

  updatePagedMembers() {
    if (!this.paginator) {
      this.pagedMembers = this.filteredMembers;
      return;
    }
    const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
    const endIndex = startIndex + this.paginator.pageSize;
    this.pagedMembers = this.filteredMembers.slice(startIndex, endIndex);
    console.log(
      `Paginator: pageIndex=${this.paginator.pageIndex}, pageSize=${this.paginator.pageSize}, showing ${startIndex}-${endIndex} of ${this.filteredMembers.length}`
    );
  }

  onSearchChange() {
    this.applyFilter();
  }

  sortData(sort: Sort) {
    this.sortField = sort.active;
    this.sortDirection = (sort.direction as 'asc' | 'desc') || 'asc';
    this.applyFilter();
  }

  editMember(id: string) {
    if (!this.isAuthorized) {
      this.snackBar.open('You are not authorized to edit members.', 'Close', { duration: 2500 });
      return;
    }
    this.router.navigate(['/members/edit', id]);
  }

  addMember() {
    if (!this.isAuthorized) {
      this.snackBar.open('You are not authorized to add members.', 'Close', { duration: 2500 });
      return;
    }
    this.router.navigate(['/members/add']);
  }

  deleteMember(id: string) {
    if (!id) return;
    if (!this.isAuthorizedToDelete) {
      this.snackBar.open('You are not authorized to delete members.', 'Close', { duration: 2500 });
      return;
    }

    // Find the member to get their name for the confirmation dialog
    const member = this.members.find((m) => m._id === id);
    const memberName = member ? `${member.firstName} ${member.lastName}`.trim() : `Member ${id}`;

    this.confirmDialog.confirmDelete(memberName, 'member').subscribe((confirmed) => {
      if (confirmed) {
        this.memberService.delete({ id, name: memberName, authorName: this.author?.name }).subscribe({
          next: () => {
            this.snackBar.open('Member deleted', 'Close', { duration: 2000 });
            this.loadMembers();
          },
          error: (err) => {
            if (err.status === 403 || err.status === 401) {
              this.snackBar.open('You are not authorized to delete members.', 'Close', {
                duration: 2500,
              });
            } else if (err.status === 409) {
              console.log('Error details:', err.error.options);
              this.snackBar.open('This member has score records and cannot be deleted.', 'Close', {
                duration: 2500,
              });
            } else {
              this.snackBar.open('Error deleting member', 'Close', { duration: 2000 });
            }
          },
        });
      }
    });
  }

  toggleColumnVisibility(columnKey: string) {
    const column = this.allColumns.find((col) => col.key === columnKey);
    if (column && !column.fixed) {
      // Prevent hiding all data columns (keep at least one visible)
      const visibleDataColumns = this.allColumns.filter((col) => col.visible && !col.fixed).length;
      if (column.visible && visibleDataColumns <= 1) {
        this.snackBar.open('At least one data column must remain visible', 'Close', {
          duration: 2000,
        });
        return;
      }
      column.visible = !column.visible;
      this.saveColumnPreferences();

      // Reapply filter to reflect column visibility changes
      this.applyFilter();
    }
  }

  isColumnVisible(columnKey: string): boolean {
    const column = this.allColumns.find((col) => col.key === columnKey);
    return column ? column.visible : false;
  }

  getVisibleColumnsCount(): number {
    return this.allColumns.filter((col) => col.visible).length;
  }

  hasCustomPreferences(): boolean {
    // Check if current settings differ from defaults
    const defaultColumns = [
      { key: 'fullName', visible: true },
      { key: 'Email', visible: true },
      { key: 'usgaIndex', visible: true },
      { key: 'GHIN', visible: true },
      { key: 'handicap', visible: true },
      { key: 'lastDatePlayed', visible: true },
    ];

    return defaultColumns.some((defaultCol) => {
      const currentCol = this.allColumns.find((col) => col.key === defaultCol.key);
      return currentCol && currentCol.visible !== defaultCol.visible;
    });
  }

  resetColumns() {
    this.allColumns.forEach((column) => {
      column.visible = true;
    });
    this.saveColumnPreferences();
  }

  private saveColumnPreferences() {
    // Only save preferences for non-fixed columns
    const preferences: ColumnPreference[] = this.allColumns
      .filter((col) => !col.fixed)
      .map((col) => ({ key: col.key, visible: col.visible }));

    this.preferencesService.saveMemberListColumnPreferences(preferences);
  }

  /**
   * trackBy function for column menu to avoid unnecessary re-renders
   */
  trackByColumn(_: number, column: { key: string }): string {
    return column.key;
  }

  /**
   * trackBy function for member rows to avoid re-rendering rows unnecessarily
   */
  trackByMember(_: number, member: Member): string {
    return (member &&
      ((member as any)._id ||
        (member as any).id ||
        member.Email ||
        member.firstName + ' ' + (member.lastName || ''))) as string;
  }

  clearAllPreferences() {
    this.confirmDialog
      .confirmAction(
        'Reset All Preferences',
        'This will reset all your column preferences to default settings. Are you sure?',
        'Reset',
        'Cancel'
      )
      .subscribe((confirmed) => {
        if (confirmed) {
          this.preferencesService.clearUserPreferences();
          this.initializeColumns(); // Reload with defaults
          this.snackBar.open('All preferences have been reset to defaults', 'Close', {
            duration: 3000,
          });
        }
      });
  }

  removeDuplicateEmails() {
    if (!this.isAuthorizedToDelete) {
      this.snackBar.open('You are not authorized to remove duplicates.', 'Close', {
        duration: 2500,
      });
      return;
    }

    this.confirmDialog
      .confirmAction(
        'Remove Duplicate Emails',
        'This will permanently delete members with duplicate email addresses, keeping only the oldest member for each email. This action cannot be undone.',
        'Remove Duplicates',
        'Cancel'
      )
      .subscribe((confirmed) => {
        if (confirmed) {
          this.memberService.removeDuplicateEmails().subscribe({
            next: (response) => {
              if (response.deletedCount > 0) {
                this.snackBar.open(`Removed ${response.deletedCount} duplicate members`, 'Close', {
                  duration: 4000,
                });
                this.loadMembers(); // Refresh the list
              } else {
                this.snackBar.open('No duplicate email addresses found', 'Close', {
                  duration: 3000,
                });
              }
            },
            error: (err) => {
              if (err.status === 403 || err.status === 401) {
                this.snackBar.open('You are not authorized to remove duplicates.', 'Close', {
                  duration: 2500,
                });
              } else {
                this.snackBar.open('Error removing duplicates', 'Close', { duration: 3000 });
              }
            },
          });
        }
      });
  }

  // Add a method to toggle hidden members visibility
  toggleHiddenMembers() {
    this.showHiddenMembers = !this.showHiddenMembers;

    // Ensure the hidden column is visible when showing hidden members
    const hiddenColumn = this.allColumns.find((col) => col.key === 'hidden');
    if (hiddenColumn) {
      hiddenColumn.visible = this.showHiddenMembers;
    }

    this.applyFilter();
  }
}
