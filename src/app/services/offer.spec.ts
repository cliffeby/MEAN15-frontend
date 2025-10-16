import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OffersService } from './offer';
import { Auth } from './auth';

describe('OffersService', () => {
  let service: OffersService;

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
    service = TestBed.inject(OffersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
