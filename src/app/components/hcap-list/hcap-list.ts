import { Component, OnInit, ViewChild, OnDestroy, HostBinding } from '@angular/core';
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
import { calculateCourseHandicap } from '../../utils/score-utils';
import { HCap } from '../../models/hcap';
import { UserPreferencesService, ColumnPreference } from '../../services/user-preferences.service';
import { ConfigurationService } from '../../services/configuration.service';
import { Subscription } from 'rxjs';

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
    MatCheckboxModule,
  ],
})
export class HcapListComponent implements OnInit, OnDestroy {
  @HostBinding('class.dark-theme') isDarkTheme = false;
  private mqListener: ((e: MediaQueryListEvent) => void) | null = null;
  private configSub: Subscription | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  hcaps: HCap[] = [];
  filtered: HCap[] = [];
  paged: HCap[] = [];
  loading = false;
  activeSort: Sort = { active: '', direction: '' };
  /** Per-row running sequence number: how many records does this member have up to & including this row's date */
  rowRecordNumber = new Map<string, number>();

  private getMemberId(h: any): string {
    const mid = h.memberId;
    if (!mid) return '';
    if (typeof mid === 'object' && mid._id) return mid._id.toString();
    return mid.toString();
  }

  search = '';
  pageSize = 20;
  pageIndex = 0;

  allColumns: { key: string; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'postedScore', label: 'Posted Score' },
    { key: 'datePlayed', label: 'Date' },
    { key: 'rochIndexB4Round', label: 'Roch Index Used Today' },
    { key: 'usgaIndexB4Round', label: 'USGA Index Used Today' },
    { key: 'rochCapB4Round', label: 'Roch Handicap Used Today' },
    { key: 'usgaCapB4Round', label: 'USGA Handicap Used Today' },
    { key: 'rochIndexAfterRound', label: 'Roch Index After Today' },
    { key: 'usgaIndexAfterRound', label: 'USGA Index After Today' },
    { key: 'recordCount', label: '# Records' },
    { key: 'scCourse', label: 'Course' },
    { key: 'scTees', label: 'Tees' },
    { key: 'teeAbreviation', label: 'Tee Abrev' },
    { key: 'scRating', label: 'Rating' },
    { key: 'scSlope', label: 'Slope' },
    // { key: 'scPar', label: 'Par' },
    { key: 'author', label: 'Author' },
  ];
  
   calculateCourseHandicap(index: number | null, slope: number | undefined): number | '' {
    return index != null ? calculateCourseHandicap(index, slope) : '';
  }

  getMemberRecordCount(row: HCap): number {
    const id = ((row as any)._id || '').toString();
    return this.rowRecordNumber.get(id) ?? 0;
  }
  displayedColumns: string[] = this.allColumns.map((c) => c.key);
  private readonly HCAP_PREF_KEY = 'hcapListColumns';
  toggleColumn(col: string) {
    const idx = this.displayedColumns.indexOf(col);
    if (idx > -1) {
      // Hide column
      this.displayedColumns.splice(idx, 1);
    } else {
      // Show column (add at original order)
      const origIdx = this.allColumns.findIndex((c) => c.key === col);
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
      visible: this.displayedColumns.includes(col.key),
    }));
    this.userPreferences.saveCustomColumnPreferences(this.HCAP_PREF_KEY, prefs);
  }

  private loadColumnPreferences(): void {
    const prefs: ColumnPreference[] = this.userPreferences.getCustomColumnPreferences(
      this.HCAP_PREF_KEY,
      this.allColumns.map((col: { key: string }) => ({ key: col.key, visible: true })),
    );
    this.displayedColumns = prefs
      .filter((p: ColumnPreference) => p.visible)
      .map((p: ColumnPreference) => p.key);
  }

  constructor(
    private hcapService: HCapService,
    private snackBar: MatSnackBar,
    private userPreferences: UserPreferencesService,
    private configService: ConfigurationService,
  ) {
    this.pageSize = this.configService.displayConfig().hcapListPageSize ?? 20;
  }

  ngOnInit() {
    this.loadColumnPreferences();
    try { this.applyTheme(this.configService.displayConfig().theme); } catch { /* ignore in tests */ }
    this.configSub = this.configService.config$.subscribe(cfg => this.applyTheme(cfg.display.theme));
    this.loadHcaps();
  }

  loadHcaps() {
    this.loading = true;
    this.hcapService.getAll().subscribe({
      next: (res) => {
        this.hcaps = res.hcaps || res || [];
        // Build per-row running sequence numbers, oldest-first per member
        this.rowRecordNumber.clear();
        const byMember = new Map<string, any[]>();
        for (const h of this.hcaps) {
          const key = this.getMemberId(h);
          if (!byMember.has(key)) byMember.set(key, []);
          byMember.get(key)!.push(h);
        }
        byMember.forEach((records) => {
          records.sort((a, b) => new Date(a.datePlayed).getTime() - new Date(b.datePlayed).getTime());
          records.forEach((h, idx) => {
            const id = ((h as any)._id || '').toString();
            this.rowRecordNumber.set(id, idx + 1);
          });
        });
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
      },
    });
  }

  applyFilter() {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.hcaps];
    } else {
      this.filtered = this.hcaps.filter(
        (h) =>
          (h.name || '')?.toString().toLowerCase().includes(term) ||
          (h.memberId || '')?.toString().toLowerCase().includes(term),
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
    this.configService.updateSection('display', { hcapListPageSize: event.pageSize });
    this.updatePaged();
  }

  ngOnDestroy(): void {
    this.configSub?.unsubscribe();
    if (this.mqListener && typeof window !== 'undefined' && (window as any).matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.mqListener);
      this.mqListener = null;
    }
  }

  private applyTheme(theme: string) {
    if (!theme) theme = 'auto';
    if (theme === 'dark') {
      this.setDark(true);
    } else if (theme === 'light') {
      this.setDark(false);
    } else {
      if (typeof window !== 'undefined' && (window as any).matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        this.setDark(!!mq.matches);
        if (this.mqListener) mq.removeEventListener('change', this.mqListener);
        this.mqListener = (e: MediaQueryListEvent) => this.setDark(!!e.matches);
        mq.addEventListener('change', this.mqListener);
      } else {
        this.setDark(false);
      }
    }
  }

  private setDark(val: boolean) { this.isDarkTheme = val; }
}
