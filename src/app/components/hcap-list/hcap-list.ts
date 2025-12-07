import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { HCapService } from '../../services/hcapService';
import { HCap } from '../../models/hcap';

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
    FormsModule
  ]
})
export class HcapListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  hcaps: HCap[] = [];
  filtered: HCap[] = [];
  paged: HCap[] = [];
  loading = false;

  search = '';
  pageSize = 20;
  pageIndex = 0;

  displayedColumns: string[] = ['name', 'postedScore', 'currentHCap', 'newHCap', 'datePlayed', 'username'];

  constructor(private hcapService: HCapService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadHcaps();
  }

  loadHcaps() {
    this.loading = true;
    this.hcapService.getAll().subscribe({
      next: (res) => {
        this.hcaps = res.hcaps || res || [];
        this.applyFilter();
        this.loading = false;
        console.log(res)
        setTimeout(() => {
          if (this.paginator) {
            this.paginator.page.subscribe((_) => this.updatePaged());
            this.updatePaged();
          }
        }, 0);
      },
      error: (err) => {
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
    this.updatePaged();
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
