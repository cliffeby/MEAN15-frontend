import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { LoanList } from './loan-list';
import { Auth } from '../../../services/auth';
import { Loan } from '../../../services/loan';

describe('LoanList', () => {
  let component: LoanList;
  let fixture: ComponentFixture<LoanList>;

  beforeEach(async () => {
    const mockAuth = { role: 'admin' } as Partial<Auth> as Auth;
    const mockLoan = {
      getAll: () => of({ loans: [] }),
      getMyLoans: () => of([]),
      delete: (id: string) => of({})
    } as Partial<Loan> as Loan;
    const mockRouter = { navigate: (c: any[]) => Promise.resolve(true) } as Partial<Router> as Router;
    const mockSnack = { open: (m: string) => {} } as Partial<MatSnackBar> as MatSnackBar;

    const mockActivatedRoute = {
      snapshot: { paramMap: { get: (k: string) => null } }
    };

    await TestBed.configureTestingModule({
      imports: [LoanList],
      providers: [
        { provide: Auth, useValue: mockAuth },
        { provide: Loan, useValue: mockLoan },
        { provide: Router, useValue: mockRouter },
        { provide: MatSnackBar, useValue: mockSnack },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
