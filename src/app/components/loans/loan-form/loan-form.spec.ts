import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { LoanForm } from './loan-form';
import { Loan } from '../../../services/loan';
import { Auth } from '../../../services/auth';
import { Customer } from '../../../services/customer';

describe('LoanForm', () => {
  let component: LoanForm;
  let fixture: ComponentFixture<LoanForm>;

  beforeEach(async () => {
    const mockLoan = {
      getById: (id: string) => of({ loan: {} }),
      getAll: () => of([]),
      create: (p: any) => of({}),
      update: (id: string, p: any) => of({}),
    } as Partial<Loan> as Loan;

    const mockAuth = {
      payload: () => ({ id: 'user1', name: 'Test User' }),
      token: () => 'fake-token',
      logout: () => {}
    } as Partial<Auth> as Auth;

    const mockCustomer = {
      getAll: () => of([])
    } as Partial<Customer> as Customer;

    const mockActivatedRoute: Partial<ActivatedRoute> = {
      snapshot: { paramMap: { get: (key: string) => null } as any } as any
    };

    const mockRouter: Partial<Router> = {
      navigate: (commands: any[]) => Promise.resolve(true)
    } as Partial<Router> as Router;

    await TestBed.configureTestingModule({
      imports: [LoanForm],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: Loan, useValue: mockLoan },
        { provide: Auth, useValue: mockAuth },
        { provide: Customer, useValue: mockCustomer }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
