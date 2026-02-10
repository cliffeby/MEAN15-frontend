import { Component, OnInit } from '@angular/core';
import { MemberService } from '../../services/memberService';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { UserPreferencesService, ColumnPreference } from '../../services/user-preferences.service';

export interface MemberReportRow {
  name: string;
  lastName: string;
  recentDateOfPlay: string | null;
  usgaIndex: number | null;
  handicap: number | null;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss'],
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatMenuModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule
  ],
})

export class ReportsComponent implements OnInit {
  static readonly COLUMN_PREF_KEY = 'memberReportColumns';
  static readonly DEFAULT_COLUMNS: ColumnPreference[] = [
    { key: 'name', visible: true },
    { key: 'recentDateOfPlay', visible: true },
    { key: 'usgaIndex', visible: true },
    { key: 'handicap', visible: true },
  ];

  showingMemberReport = false;
  today = new Date();
  sortField: 'lastName' | 'recentDateOfPlay' | 'handicap' | 'usgaIndex' = 'lastName';
  sortDirection: 'asc' | 'desc' = 'asc';
  memberReport: MemberReportRow[] = [];
  filteredReport: MemberReportRow[] = [];

  allColumns: Array<{ key: string; label: string; visible: boolean }> = [
    { key: 'name', label: 'Name', visible: true },
    { key: 'recentDateOfPlay', label: 'Most Recent Date of Play', visible: true },
    { key: 'usgaIndex', label: 'USGA Index', visible: true },
    { key: 'handicap', label: 'newHCap', visible: true },
  ];

  constructor(
    private memberService: MemberService,
    private preferencesService: UserPreferencesService
  ) {}

  ngOnInit(): void {
    this.loadColumnPreferences();
  }

  showMemberReport() {
    this.showingMemberReport = true;
    this.memberService.getAllMembersWithRecentPlayAndHCap().subscribe((members: any[]) => {
      this.memberReport = members.map(m => ({
        name: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
        lastName: m.lastName ?? '',
        recentDateOfPlay: m.lastDatePlayed ?? m.recentDateOfPlay ?? m.recentDate ?? null,
        usgaIndex: m.usgaIndex ?? null,
        handicap: m.handicap ?? null
      }));
      this.applyFilterAndSort();
    });
  }

  applyFilterAndSort() {
    this.filteredReport = this.memberReport
      .filter(m => m.handicap !== null && m.handicap !== undefined)
      .sort((a, b) => {
        let aVal = a[this.sortField];
        let bVal = b[this.sortField];
        if (this.sortField === 'lastName') {
          aVal = typeof aVal === 'string' ? aVal.toLowerCase() : '';
          bVal = typeof bVal === 'string' ? bVal.toLowerCase() : '';
        }
        if (this.sortField === 'recentDateOfPlay') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        if (this.sortField === 'handicap') {
          aVal = aVal ? aVal : 0;
          bVal = bVal ? bVal : 0;
        }
        if (this.sortField === 'usgaIndex') {
          aVal = aVal ? aVal : 0;
          bVal = bVal ? bVal : 0;
        }
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return this.sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }

  setSort(field: 'lastName' | 'recentDateOfPlay' | 'handicap' | 'usgaIndex') {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilterAndSort();
  }

  // Column visibility helpers
  toggleColumnVisibility(columnKey: string) {
    const column = this.allColumns.find(col => col.key === columnKey);
    if (column) {
      // Prevent hiding all columns (keep at least one visible)
      const visibleColumns = this.allColumns.filter(col => col.visible).length;
      if (column.visible && visibleColumns <= 1) {
        return;
      }
      column.visible = !column.visible;
      this.saveColumnPreferences();
    }
  }

  saveColumnPreferences() {
    // Only save key/visible
    const prefs = this.allColumns.map(col => ({ key: col.key, visible: col.visible }));
    this.preferencesService.saveCustomColumnPreferences(ReportsComponent.COLUMN_PREF_KEY, prefs);
  }

  loadColumnPreferences() {
    // Get preferences and merge with labels
    const prefs = this.preferencesService.getCustomColumnPreferences(ReportsComponent.COLUMN_PREF_KEY, ReportsComponent.DEFAULT_COLUMNS);
    // Merge with labels
    this.allColumns.forEach(col => {
      const pref = prefs.find(p => p.key === col.key);
      if (pref) col.visible = pref.visible;
    });
  }

  resetColumns() {
    this.allColumns.forEach(col => (col.visible = true));
    this.saveColumnPreferences();
  }

  isColumnVisible(columnKey: string): boolean {
    const column = this.allColumns.find(col => col.key === columnKey);
    return column ? column.visible : false;
  }

  getVisibleColumnsCount(): number {
    return this.allColumns.filter(col => col.visible).length;
  }

  printMemberReport() {
    setTimeout(() => window.print(), 100);
  }
}
