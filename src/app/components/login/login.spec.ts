import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/authService';

import { Login } from './login';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  let mockAuthService: any;

  beforeEach(async () => {
    const mockRouter = {
      navigate: jasmine.createSpy('navigate'),
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
      serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue('mockSerializedUrl')
    } as Partial<Router> as Router;

    const mockActivatedRoute = {
      snapshot: { params: {} },
      queryParams: of({})
    } as Partial<ActivatedRoute> as ActivatedRoute;

    const mockRouterLink = {
      subscribeToNavigationEventsIfNecessary: jasmine.createSpy('subscribeToNavigationEventsIfNecessary'),
      ngOnChanges: jasmine.createSpy('ngOnChanges')
    };

    mockAuthService = {
      localLogin: jasmine.createSpy('localLogin').and.returnValue(of({ mustChangePassword: false }))
    };

    await TestBed.configureTestingModule({
      imports: [Login, HttpClientModule, RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: RouterLink, useValue: mockRouterLink },
        { provide: AuthService, useValue: mockAuthService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  xit('should create', () => {
    expect(component).toBeTruthy();
  });
  
  xit('should render title', () => {
    component.localLogin(); // Explicitly call localLogin
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Welcome to Rochester');
    expect(mockAuthService.localLogin).toHaveBeenCalled(); // Debug: Ensure localLogin is called
    console.log('AuthService instance:', component['authService']); // Debug: Log AuthService instance
  });
});
