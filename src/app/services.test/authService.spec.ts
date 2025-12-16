import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';

import { AuthService } from '../services/authService';

// Mock MsalService
const mockMsalService = {
  instance: {
    getAllAccounts: () => [{
      idTokenClaims: {
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user']
      }
    }]
  }
};

describe('Auth', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MsalService, useValue: mockMsalService }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
