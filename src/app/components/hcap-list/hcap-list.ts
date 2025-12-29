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
import { HCapService } from '../../services/hcapService';
import { HandicapService } from '../../services/handicapService';
import { ScoreService } from '../../services/scoreService';
import { HCap } from '../../models/hcap';
import { Score } from '../../models/score';

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
    MatSortModule
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

  displayedColumns: string[] = ['name', 'postedScore', 'currentHCap', 'newHCap', 'datePlayed', 'author'];

  constructor(
    private hcapService: HCapService,
    private handicapService: HandicapService,
    private scoreService: ScoreService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
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
              if (!grouped[h.memberId]) grouped[h.memberId] = [];
              grouped[h.memberId].push(h);
            });
            // Compute and assign newHCap for each group
            Object.keys(grouped).forEach(memberId => {
              const records = grouped[memberId];
              // Compute scoreDifferential using USGA formula for each record
              const recordsForCalc = records.map(r => {
                const scoreObj = scores.find(s => s._id === r.scoreId);
                const score = r.postedScore;
                const rating = scoreObj?.scRating;
                const slope = scoreObj?.scSlope;
                let handicapDifferential: number | undefined = r.handicapDifferential;
                let scoreDifferential: number | undefined = undefined;
                if (
                  typeof score === 'number' &&
                  typeof rating === 'number' &&
                  typeof slope === 'number' &&
                  slope > 0
                ) {
                  scoreDifferential = ((score - rating) * 113) / slope;
                  handicapDifferential = parseFloat(scoreDifferential.toFixed(1));
                }
                console.log('Calculating for memberId', memberId, rating, 'slope', slope, 'handicapDifferential', handicapDifferential, 'scoreDifferential', scoreDifferential);
                return { ...r, scoreDifferential };
              });
              const newHCap = this.handicapService.computeHandicap(recordsForCalc as any);
              // Debug: log computed newHCap values
              console.log('memberId', memberId, 'records', records, 'computed newHCap', newHCap);
              records.forEach(r => (r.newHCap = newHCap));
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
