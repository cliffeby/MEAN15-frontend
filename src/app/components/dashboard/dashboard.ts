import { Component, inject, signal, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { NgChartsModule } from 'ng2-charts';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Auth } from '../../services/auth';
import { Loan } from '../../services/loan';
import { OffersService } from '../../services/offer';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatCardModule, MatSnackBarModule,
    MatTableModule, MatPaginatorModule, MatSortModule, NgChartsModule,MatFormFieldModule,  // <-- add this
    MatInputModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements AfterViewInit {
  router = inject(Router);
  auth = inject(Auth);
  OffersService = inject(OffersService);
  loanService = inject(Loan);
  snackBar = inject(MatSnackBar);

  totalCustomers = signal(0);
  totalOffers = signal(0);
  totalLoans = signal(0);
  customersData: any[] = [];
  offersData: any[] = [];
  loansData: any[] = [];
  myLoans = signal<any[]>([]);
  dataSource!: MatTableDataSource<any>;

  private routerSub!: Subscription;

  displayedLoanColumns: string[] = ['customer', 'amount', 'status', 'createdBy'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loanStatusChartData = {
    labels: ['Approved', 'Pending', 'Rejected'],
    datasets: [{ data: [0, 0, 0], backgroundColor: ['#4caf50', '#ff9800', '#f44336'] }]
  };

  constructor(private cdr: ChangeDetectorRef) {
    if (this.auth.role === 'admin') {
      this.loadAdminStats();
    } else if (this.auth.role === 'customer') {
      this.loadUserLoans();
    }
  }

  ngAfterViewInit() {
    
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
  
      // Custom filter predicate for nested objects
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();

      // Convert all fields to a single string
      const dataStr = [
        data._id,
        data.status,
        data.amount,
        data.customer?.name,
        data.customer?.email,
        data.customer?.role,
        data.createdBy?.name
      ]
        .filter(Boolean) // remove null/undefined
        .join(' ')
        .toLowerCase();

      return dataStr.includes(transformedFilter);
    };
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
    this.snackBar.open('Logged out successfully', 'Close', { duration: 2000 });
  }

  loadAdminStats() {
    // Load Customers
    this.OffersService.getOffers().subscribe({
      next: (res: any) => {
        this.offersData = res;           // store the array of offers
        this.totalOffers.set(res.length); // set total count
      },
      error: () => this.totalOffers.set(0)
    });

    // Load Loans
    this.loanService.getAll().subscribe({
      next: (res: any) => {
        const loans = Array.isArray(res.loans) ? res.loans : [];
        this.loansData = loans;
        this.totalLoans.set(loans.length);

        this.dataSource = new MatTableDataSource(loans);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;

        // Custom filter for nested objects
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dataStr = [
        data._id,
        data.amount,
        data.status,
        data.customer?.name,
        data.customer?.email,
        data.customer?.role,
        data.createdBy?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return dataStr.includes(transformedFilter);
    };

        this.updateLoanChart(loans);
      },
      error: () => this.totalLoans.set(0)
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
  if (this.dataSource) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  }

  loadUserLoans() {
    this.loanService.getMyLoans().subscribe({
      next: (res: any[]) => this.myLoans.set(res),
      error: () => this.myLoans.set([])
    });
  }

  goToAddLoan() {
    this.router.navigate(['/loans/add']);
  }

  updateLoanChart(loans: any[]) {
    const safeLoans = Array.isArray(loans) ? loans : [];
    const approved = safeLoans.filter(l => l.status.toLowerCase() === 'approved').length;
    const pending = safeLoans.filter(l => l.status.toLowerCase() === 'pending').length;
    const rejected = safeLoans.filter(l => l.status.toLowerCase() === 'declined').length;

    this.loanStatusChartData.datasets[0].data = [approved, pending, rejected];
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  
}
