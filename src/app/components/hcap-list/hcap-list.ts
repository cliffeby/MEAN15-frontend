import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { HCapService } from '../../services/hcapService';
import { HCap } from '../../models/hcap';
import { UserPreferencesService, ColumnPreference } from '../../services/user-preferences.service';

@Component({
  selector: 'app-hcap-list',
  templateUrl: './hcap-list.html',
  styleUrls: ['./hcap-list.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    FormsModule,
    MatSortModule,
    MatCheckboxModule
  ]
})
export class HcapListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  hcaps: HCap[] = [];
  filtered: HCap[] = [];
  paged: HCap[] = [];
  loading = false;
  activeSort: Sort = {active: '', direction: ''};

  search = '';
  pageSize = 20;
  pageIndex = 0;

  allColumns: { key: string, label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'postedScore', label: 'Posted Score' },
    { key: 'rochDifferentialToday', label: 'Todays Differential' },
    { key: 'currentHCap', label: 'Played HCap Index' },
    { key: 'newHCap', label: 'New HCap Index' },
    { key: 'datePlayed', label: 'Date' },
    { key: 'usgaIndex', label: 'USGA Index' },
    { key: 'author', label: 'Author' },
  ];
  displayedColumns: string[] = this.allColumns.map(c => c.key);
  private readonly HCAP_PREF_KEY = 'hcapListColumns';
  toggleColumn(col: string) {
    const idx = this.displayedColumns.indexOf(col);
    if (idx > -1) {
      // Hide column
      this.displayedColumns.splice(idx, 1);
    } else {
      // Show column (add at original order)
      const origIdx = this.allColumns.findIndex(c => c.key === col);
      if (origIdx > -1) {
        this.displayedColumns.splice(origIdx, 0, col);
      } else {
        this.displayedColumns.push(col);
      }
    }
    // Defensive: ensure at least one column is always visible
    if (this.displayedColumns.length === 0) {
      this.displayedColumns = [this.allColumns[0].key];
    }
    this.saveColumnPreferences();
  }

  private saveColumnPreferences(): void {
    const prefs: ColumnPreference[] = this.allColumns.map((col: { key: string }) => ({
      key: col.key,
      visible: this.displayedColumns.includes(col.key)
    }));
    this.userPreferences.saveCustomColumnPreferences(this.HCAP_PREF_KEY, prefs);
  }

  private loadColumnPreferences(): void {
    const prefs: ColumnPreference[] = this.userPreferences.getCustomColumnPreferences(
      this.HCAP_PREF_KEY,
      this.allColumns.map((col: { key: string }) => ({ key: col.key, visible: true }))
    );
    this.displayedColumns = prefs.filter((p: ColumnPreference) => p.visible).map((p: ColumnPreference) => p.key);
  }

  constructor(
    private hcapService: HCapService,
    private snackBar: MatSnackBar,
    private userPreferences: UserPreferencesService
  ) {}

  ngOnInit() {
    this.loadColumnPreferences();
    this.loadHcaps();
  }

  loadHcaps() {
    this.loading = true;
    this.hcapService.getAll().subscribe({
      next: (res) => {
        this.hcaps = res.hcaps || res || [];
        this.applyFilter();
        this.loading = false;
        setTimeout(() => {
          if (this.paginator) {
            this.paginator.page.subscribe((_) => this.updatePaged());
            this.updatePaged();
          }
          if (this.sort) {
            this.sort.sortChange.subscribe((sort: Sort) => {
              this.activeSort = sort;
              this.applySort();
              this.updatePaged();
            });
          }
        }, 0);
      },
      error: (_err) => {
        this.snackBar.open('Error loading HCap data', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter() {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.hcaps];
    } else {
      this.filtered = this.hcaps.filter(h =>
        (h.name || '')?.toString().toLowerCase().includes(term) ||
        (h.memberId || '')?.toString().toLowerCase().includes(term)
      );
    }
    if (this.paginator) this.paginator.firstPage();
    this.applySort();
    this.updatePaged();
  }

  applySort() {
    const { active, direction } = this.activeSort;
    if (!active || !direction) {
      this.filtered = [...this.filtered];
      return;
    }
    this.filtered = [...this.filtered].sort((a: any, b: any) => {
      let valueA = a[active];
      let valueB = b[active];
      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  updatePaged() {
    if (!this.paginator) {
      this.paged = this.filtered;
      return;
    }
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.paged = this.filtered.slice(start, end);
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaged();
  }
}
