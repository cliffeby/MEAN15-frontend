import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../services/audit.service';
import { MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-audit-report',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './audit-report.component.html',
  styleUrls: ['./audit-report.component.scss'],
})
export class AuditReportComponent implements OnInit {
  displayedColumns: string[] = ['date', 'method', 'route', 'name', 'author'];
  dataSource = new MatTableDataSource<any>([]);
  filterValue = '';
  loading = true;
  error = '';
  total = 0;
  page = 1;
  pageSize = 10;

  private _sort!: MatSort;
  private _paginator!: any;

  @ViewChild(MatSort)
  set sort(sort: MatSort) {
    this._sort = sort;
    this.dataSource.sort = sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      if (property === 'date') {
        return item.date || '';
      }
      return item[property];
    };
  }

  @ViewChild('paginator')
  set paginator(paginator: any) {
    this._paginator = paginator;
    this.dataSource.paginator = paginator;
  }

  constructor(private auditService: AuditService) {}

  ngOnInit() {
    this.fetchLogs();
  }

  fetchLogs() {
    this.loading = true;
    this.auditService.getAuditLogs({
      page: this.page,
      pageSize: this.pageSize,
      name: this.filterValue
    }).subscribe({
      next: (res) => {
        this.dataSource.data = res.logs.map((log: any) => ({
          ...log,
          date: log.time ? log.time.substring(0, 10) : '',
          method:
            log.method === 'POST'
              ? 'Create'
              : log.method === 'PUT'
              ? 'Replaced'
              : log.method === 'PATCH'
              ? 'Update'
              : log.method,
          route:
            log.route && log.route.includes('match')
              ? 'Match'
              : log.route.includes('member')
              ? 'Member'
              : log.route.includes('scorecard')
              ? 'Scorecard'
              : log.route.includes('score')
              ? 'Score'
              : log.route.includes('hcaps')
                ? 'Handicap/Score'
                : log.route
        }));
        this.total = res.total;
        this.loading = false;
      },
      error: (_err) => {
        this.error = 'Failed to load audit logs.';
        this.loading = false;
      },
    });
  }

  onPageChange(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.fetchLogs();
  }

  applyFilter(event: Event) {
    this.filterValue = (event.target as HTMLInputElement).value;
    this.page = 1;
    this.fetchLogs();
  }
}
