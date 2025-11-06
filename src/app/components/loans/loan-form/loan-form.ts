import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';

import { LoanService } from '../../../services/loanService';
import { AuthService } from '../../../services/authService';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CustomerService } from '../../../services/customerService';

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatToolbarModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './loan-form.html',
  styleUrls: ['./loan-form.scss']
})
export class LoanForm implements OnInit {
  router = inject(Router);
  route = inject(ActivatedRoute);
  snackBar = inject(MatSnackBar);
  loanService = inject(LoanService);
  auth = inject(AuthService);
  fb = inject(FormBuilder);
  customerService = inject(CustomerService);

  loanForm!: FormGroup;
  loanId: string | null = null;
  isEdit = false;
  customers: any[] = [];

  ngOnInit() {
    this.loanId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.loanId;

    // Initialize with defaults
    this.loanForm = this.fb.group({
      customerId: [
        { value: '', disabled: this.isEdit }, // disable only if editing
        Validators.required
      ],
      amount: [0, [Validators.required, Validators.min(1)]],
      termMonths: [12, [Validators.required, Validators.min(1)]],
      interestRate: [0, [Validators.required, Validators.min(0)]],
      status: ['pending', Validators.required]
    });

    // load customers
    this.customerService.getAll().subscribe({
      next: (res: any) => {
        this.customers = Array.isArray(res) ? res : res.customers || [];

        // if edit mode, load loan
        if (this.isEdit && this.loanId) {
          this.loadLoan(this.loanId);
        }
      },
      error: () => this.customers = []
    });

    if (this.isEdit && this.loanId) {
      this.loadLoan(this.loanId);
    } else {
      // For Add mode, fill customer with name from token payload
      const payload = this.auth.payload();
      if (payload?.name) {
        this.loanForm.patchValue({ customer: payload.name });
      }
    }
  }

  loadLoan(id: string) {
    this.loanService.getById(id).subscribe({
      next: (loanData: any) => {
        this.loanForm.patchValue({
          customer: loanData.loan?.customer?.name || '',
          amount: loanData.loan?.amount,
          termMonths: loanData.loan?.termMonths,
          interestRate: loanData.loan?.interestRate,
          status: loanData.loan?.status
        });
      },
      error: () => this.snackBar.open('Failed to load loan', 'Close', { duration: 2000 })
    });
  }

  submit() {
    if (this.loanForm.invalid) return;

    const payload = {
      ...this.loanForm.getRawValue(), // include disabled customer
      customer: this.isEdit ? undefined : this.auth.payload()?.id
    };

    if (this.isEdit && this.loanId) {
      this.loanService.update(this.loanId, payload).subscribe({
        next: () => {
          this.snackBar.open('Loan updated successfully', 'Close', { duration: 2000 });
          this.router.navigate(['/loans']);
        },
        error: () => this.snackBar.open('Failed to update loan', 'Close', { duration: 2000 })
      });
    } else {
      this.loanService.create(payload).subscribe({
        next: () => {
          this.snackBar.open('Loan created successfully', 'Close', { duration: 2000 });
          this.router.navigate(['/loans']);
        },
        error: () => this.snackBar.open('Failed to create loan', 'Close', { duration: 2000 })
      });
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
    this.snackBar.open('Logged out successfully', 'Close', { duration: 2000 });
  }
}
