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
import { HandicapService } from '../../services/handicapService';
import { ScoreService } from '../../services/scoreService';
import { MemberService } from '../../services/memberService';
import { HCap } from '../../models/hcap';
import { Score } from '../../models/score';
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
    private handicapService: HandicapService,
    private scoreService: ScoreService,
    private memberService: MemberService,
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
        // Fetch all scores
        this.scoreService.getAll().subscribe({
          next: (scoreRes) => {
            const scores: Score[] = scoreRes.scores || scoreRes || [];
            // Group by memberId
            const grouped: { [memberId: string]: HCap[] } = {};
            this.hcaps.forEach(h => {
              let memberKey: string | undefined;
              if (typeof h.memberId === 'string') {
                memberKey = h.memberId;
              } else if (h.memberId && typeof h.memberId === 'object' && '_id' in h.memberId && typeof (h.memberId as any)._id === 'string') {
                memberKey = (h.memberId as any)._id;
              }
              if (!memberKey) return;
              if (!grouped[memberKey]) grouped[memberKey] = [];
              grouped[memberKey].push(h);
            });
            // Compute and assign newHCap for each group
            Object.keys(grouped).forEach(memberId => {
              const records = grouped[memberId];
              // Sort records by datePlayed ascending (oldest first)
              const sortedRecords = [...records].sort((a, b) => {
                const dA = a.datePlayed ? new Date(a.datePlayed).getTime() : 0;
                const dB = b.datePlayed ? new Date(b.datePlayed).getTime() : 0;
                return dA - dB;
              });
              // For each record, compute rolling handicap as of that date
              sortedRecords.forEach((r, idx) => {
                // For each record, build a list of all previous and current records (by date) for the current member
                const currentDate = r.datePlayed ? new Date(r.datePlayed).getTime() : 0;
                const recordsUpToNow = sortedRecords
                  .filter(rec => {
                    // Normalize memberId for rec
                    let recMemberId: string | undefined;
                    if (typeof rec.memberId === 'string') {
                      recMemberId = rec.memberId;
                    } else if (rec.memberId && typeof rec.memberId === 'object' && '_id' in rec.memberId && typeof (rec.memberId as any)._id === 'string') {
                      recMemberId = (rec.memberId as any)._id;
                    }
                    // Only include records for this member and up to current date
                    const recDate = rec.datePlayed ? new Date(rec.datePlayed).getTime() : 0;
                    return recMemberId === memberId && recDate <= currentDate;
                  })
                  .map(rec => {
                    // Debug: log all relevant values for scoreDifferential calculation
                    const debugInfo: any = { scoreId: rec.scoreId };
                    const scoreObj = scores.find(s => s._id === rec.scoreId);
                    debugInfo.scoreObj = scoreObj;
                    const score = rec.postedScore;
                    debugInfo.score = score;
                    const rating = scoreObj?.scRating;
                    debugInfo.rating = rating;
                    const slope = scoreObj?.scSlope;
                    debugInfo.slope = slope;
                    let scoreDifferential: number = 0;
                    if (
                      typeof score === 'number' &&
                      typeof rating === 'number' &&
                      typeof slope === 'number' &&
                      slope > 0
                    ) {
                      scoreDifferential = parseFloat((((score - rating) * 113) / slope).toFixed(1));
                    }
                    debugInfo.scoreDifferential = scoreDifferential;
                    console.log('HCap rolling debug:', debugInfo);
                    return {
                      ...rec,
                      scoreDifferential,
                      date: rec.datePlayed ? new Date(rec.datePlayed).toISOString() : undefined
                    };
                  });
                // Debug: confirm all recordsUpToNow are for the current member
                console.log('recordsUpToNow for memberId', memberId, ':', recordsUpToNow.map(r => r.memberId));
                const hcapAsOfThis = this.handicapService.computeHandicap(recordsUpToNow);
                // If member has no scores, use currentHCap and mark for red
                if (recordsUpToNow.length === 1 && !recordsUpToNow[0].scoreId) {
                  r.newHCap = recordsUpToNow[0].currentHCap?.toString() || '';
                  r.noScores = true;
                } else {
                  r.newHCap = hcapAsOfThis;
                  r.noScores = false;
                }

                // If newHCap is different from currentHCap, update member record
                if (
                  r.memberId &&
                  r.newHCap &&
                  r.currentHCap !== undefined &&
                  r.newHCap !== '' &&
                  parseFloat(r.newHCap) !== Number(r.currentHCap)
                ) {
                  // Always extract string ID
                  let memberIdStr: string | undefined = undefined;
                  if (typeof r.memberId === 'string') {
                    memberIdStr = r.memberId;
                  } else if (r.memberId && typeof r.memberId === 'object' && '_id' in r.memberId && typeof (r.memberId as any)._id === 'string') {
                    memberIdStr = (r.memberId as any)._id;
                  }
                  if (memberIdStr) {
                    this.memberService.update(memberIdStr, { handicap: parseFloat(r.newHCap) } as any).subscribe({
                      next: () => {
                        // r.currentHCap = parseFloat(r.newHCap);
                        console.log(`Updated member ${memberIdStr} currentHCap to ${r.newHCap}`);
                      },
                      error: (err) => {
                        console.error(`Failed to update member ${memberIdStr}:`, err);
                      }
                    });
                  } else {
                    console.error('Could not extract memberId string for update', r.memberId);
                  }
                }
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
            this.snackBar.open('Error loading Score data', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
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
