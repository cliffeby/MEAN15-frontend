import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MsalService, MsalBroadcastService, MSAL_INSTANCE } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { of, Subject } from 'rxjs';
import { Register } from './register';
import { ActivatedRoute } from '@angular/router';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;


  beforeEach(async () => {
    const mockMsalService = {
      instance: {
        getAllAccounts: () => [],
        loginRedirect: jasmine.createSpy('loginRedirect'),
        handleRedirectPromise: jasmine.createSpy('handleRedirectPromise').and.returnValue(Promise.resolve(null)),
        addEventCallback: jasmine.createSpy('addEventCallback'),
        removeEventCallback: jasmine.createSpy('removeEventCallback'),
        setActiveAccount: jasmine.createSpy('setActiveAccount'),
        getActiveAccount: jasmine.createSpy('getActiveAccount').and.returnValue(null)
      }
    };

    const mockMsalBroadcastService = {
      msalSubject$: new Subject(),
      inProgress$: of(InteractionStatus.None)
    };

    const mockMsalInstance = {
      getAllAccounts: () => [],
      loginRedirect: jasmine.createSpy('loginRedirect'),
      handleRedirectPromise: jasmine.createSpy('handleRedirectPromise').and.returnValue(Promise.resolve(null)),
      addEventCallback: jasmine.createSpy('addEventCallback'),
      removeEventCallback: jasmine.createSpy('removeEventCallback'),
      setActiveAccount: jasmine.createSpy('setActiveAccount'),
      getActiveAccount: jasmine.createSpy('getActiveAccount').and.returnValue(null)
    };

    const mockActivatedRoute = {
      snapshot: { params: {} },
      queryParams: of({})
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute }, // Mock ActivatedRoute
        { provide: MsalService, useValue: mockMsalService },
        { provide: MsalBroadcastService, useValue: mockMsalBroadcastService },
        { provide: MSAL_INSTANCE, useValue: mockMsalInstance }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
