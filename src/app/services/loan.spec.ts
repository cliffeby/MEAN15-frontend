import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Loan } from './loan';
import { Auth } from './auth';

describe('Loan', () => {
  let service: Loan;

  const mockAuth = {
    token: () => 'fake-token'
  } as Partial<Auth> as Auth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: mockAuth }
      ]
    });
    service = TestBed.inject(Loan);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
