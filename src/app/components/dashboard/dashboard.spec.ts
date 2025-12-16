
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { MsalService } from '@azure/msal-angular';

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

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MsalService, useValue: mockMsalService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
