import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Customer } from './customer';
import { Auth } from './auth';

describe('Customer', () => {
  let service: Customer;

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
    service = TestBed.inject(Customer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
