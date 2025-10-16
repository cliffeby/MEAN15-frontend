
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { LoanDetail } from './loan-detail';
import { Loan } from '../../../services/loan';

describe('LoanDetail', () => {
  let component: LoanDetail;
  let fixture: ComponentFixture<LoanDetail>;

  beforeEach(async () => {
    const mockActivatedRoute: Partial<ActivatedRoute> = {
      snapshot: {
        paramMap: {
          get: (key: string) => key === 'id' ? 'test-id' : null,
          has: (key: string) => key === 'id',
          getAll: (key: string) => key === 'id' ? ['test-id'] : [],
          keys: ['id']
        }
      } as any,
      params: of({ id: 'test-id' })
    };

    const mockRouter: Partial<Router> = {
      navigate: (commands: any[]) => Promise.resolve(true)
    } as Partial<Router> as Router;



    const mockLoan = {
      getById: (id: string) => of({ success: true, loan: { _id: id, amount: 1000, termMonths: 12, interestRate: 5, status: 'active', customer: { name: 'Test User', email: 'test@example.com' }, createdBy: { name: 'Admin', email: 'admin@example.com' } } })
    } as Partial<Loan> as Loan;

    await TestBed.configureTestingModule({
      imports: [LoanDetail],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: Loan, useValue: mockLoan },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
