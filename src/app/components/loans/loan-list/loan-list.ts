import { Component, inject, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { Auth } from '../../../services/auth';
import { Loan } from '../../../services/loan';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-loan-list',
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatSnackBarModule, MatFormFieldModule, MatInputModule,
    MatToolbarModule, RouterModule, MatCardModule, MatIconModule
  ],
  templateUrl: './loan-list.html',
  styleUrls: ['./loan-list.scss']
})
export class LoanList implements AfterViewInit {
  router = inject(Router);
  auth = inject(Auth);
  loanService = inject(Loan);
  snackBar = inject(MatSnackBar);

  loansData: any[] = [];
  dataSource!: MatTableDataSource<any>;

  displayedColumns: string[] = ['_id', 'customer', 'amount', 'status', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor() {
    this.loadLoans();
  }

  ngAfterViewInit() {
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  loadLoans() {
    const obs = this.auth.role === 'admin' ? this.loanService.getAll() : this.loanService.getMyLoans();

    obs.subscribe({
      next: (res: any) => {
        const loans = this.auth.role === 'admin' ? (res.loans || []) : res;
        this.loansData = loans;
        this.dataSource = new MatTableDataSource(loans);
        if (this.paginator) this.dataSource.paginator = this.paginator;
        if (this.sort) this.dataSource.sort = this.sort;
      },
      error: () => {
        this.loansData = [];
        this.dataSource = new MatTableDataSource<any>([]);
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    if (this.dataSource) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
      if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    }
  }

  editLoan(loan: any) {
    this.router.navigate([`/loans/edit/${loan._id}`]);
  }

  deleteLoan(loan: any) {
    if (confirm(`Delete loan ${loan._id}?`)) {
      this.loanService.delete(loan._id).subscribe(() => {
        this.snackBar.open('Loan deleted', 'Close', { duration: 2000 });
        this.loadLoans();
      });
    }
  }

  viewLoanDetails(id: string) {
    this.router.navigate([`/loans/${id}`]);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
    this.snackBar.open('Logged out successfully', 'Close', { duration: 2000 });
  }
}
