import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Router } from '@angular/router';

import { Login } from './login';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    const mockMsalService = {
      instance: {
        getAllAccounts: () => [],
        loginRedirect: jasmine.createSpy('loginRedirect'),
        handleRedirectPromise: jasmine.createSpy('handleRedirectPromise').and.returnValue(Promise.resolve(null))
      } as any
    } as any;

    const mockMsalBroadcastService = {
      msalSubject$: new Subject(),
      inProgress$: of(InteractionStatus.None)
    } as Partial<MsalBroadcastService> as MsalBroadcastService;

    const mockRouter = { navigate: () => Promise.resolve(true) } as Partial<Router> as Router;

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: MsalService, useValue: mockMsalService },
        { provide: MsalBroadcastService, useValue: mockMsalBroadcastService },
        { provide: Router, useValue: mockRouter },
        { provide: MsalService, useValue: mockMsalService }
      
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should render title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Welcome to Rochester');
  });
});
