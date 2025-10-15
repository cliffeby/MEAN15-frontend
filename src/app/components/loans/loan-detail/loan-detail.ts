// loan-detail.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Loan } from '../../../services/loan';

@Component({
  selector: 'app-loan-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatToolbarModule, MatSnackBarModule],
  templateUrl: './loan-detail.html',
  styleUrls: ['./loan-detail.scss']
})
export class LoanDetail implements OnInit {
  router = inject(Router);
  route = inject(ActivatedRoute);
  snackBar = inject(MatSnackBar);
  loanService = inject(Loan);

  loanId: string | null = null;
  loanData: any = null;
  loading = true;

  ngOnInit() {
    this.loanId = this.route.snapshot.paramMap.get('id');
    if (this.loanId) {
      this.loadLoan(this.loanId);
    }
  }

  loadLoan(id: string) {
    this.loanService.getById(id).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.loanData = res.loan;
        } else {
          this.snackBar.open('Loan not found', 'Close', { duration: 2000 });
          this.router.navigate(['/loans']);
        }
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load loan', 'Close', { duration: 2000 });
        this.router.navigate(['/loans']);
      }
    });
  }

  goBack() {
    this.router.navigate(['/loans']);
  }
}
