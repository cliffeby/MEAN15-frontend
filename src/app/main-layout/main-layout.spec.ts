import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MainLayoutComponent } from './main-layout';
import { AuthService } from '../services/authService';
import { MsalService } from '@azure/msal-angular';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';


describe('MainLayout', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
    const mockAuth = { 
      logout: () => {}, 
      get role() { return 'admin'; },
      hasRole: jasmine.createSpy('hasRole').and.returnValue(true),
      hasMinRole: jasmine.createSpy('hasMinRole').and.returnValue(true),
      getRoles: jasmine.createSpy('getRoles').and.returnValue(['admin']),
      getAuthorName: jasmine.createSpy('getAuthorName').and.returnValue('Test User'),
      getAuthorEmail: jasmine.createSpy('getAuthorEmail').and.returnValue('test@example.com')
    } as Partial<AuthService> as AuthService;
    const robustActivatedRoute = {
      params: of({}),
      queryParams: of({}),
      data: of({}),
      snapshot: { paramMap: { get: () => null, has: () => false, getAll: () => [], keys: [] } }
    };
    const mockRouter = {
      navigate: jasmine.createSpy('navigate'),
      events: of({}),
      url: '',
      createUrlTree: () => ({}),
      serializeUrl: () => '',
      navigateByUrl: () => Promise.resolve(true)
    };

    const mockMsalService = {
      logoutRedirect: jasmine.createSpy('logoutRedirect'),
      instance: {
        getAllAccounts: () => [],
        handleRedirectPromise: jasmine.createSpy('handleRedirectPromise').and.returnValue(Promise.resolve(null))
      }
    };

    await TestBed.configureTestingModule({
      imports: [
        MainLayoutComponent       
      ],
      providers: [
        {provide: Router, useValue: mockRouter }, // Override the Router provider here
        { provide: AuthService, useValue: mockAuth },
        { provide: ActivatedRoute, useValue: robustActivatedRoute },
        { provide: 'MatIconRegistry', useValue: {} },
        { provide: 'Overlay', useValue: {} },
        { provide: MsalService, useValue: mockMsalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the header, sidebar, and content area', () => {
    fixture.detectChanges(); // Ensure the DOM is updated

    const header = fixture.nativeElement.querySelector('mat-toolbar.top-navbar');
    const sidebar = fixture.nativeElement.querySelector('mat-sidenav');
    const content = fixture.nativeElement.querySelector('mat-sidenav-content');

    expect(header).toBeTruthy(); // Ensure the header exists
    expect(sidebar).toBeTruthy(); // Ensure the sidebar exists
    expect(content).toBeTruthy(); // Ensure the content area exists
  });

  

  it('should display the correct content based on the current route', () => {
    const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });

  it('should toggle the sidenav when drawer.toggle() is called', () => {
    // Spy on the MatSidenav toggle method
    const drawer = fixture.debugElement.query(By.css('mat-sidenav')).componentInstance;
    spyOn(drawer, 'toggle');

    // Call the toggleSidebar method
    component.toggleSidebar();
    fixture.detectChanges();

    // Verify that drawer.toggle() was called
    expect(drawer.toggle).toHaveBeenCalled();
  });

  it('should toggle the sidenav state', () => {
    const drawer = fixture.debugElement.query(By.css('mat-sidenav')).componentInstance;

    // Initially, the sidenav should be open
    expect(drawer.opened).toBeTrue();

    // Call the toggle method
    component.toggleSidebar();
    fixture.detectChanges();

    // Verify that the sidenav is now closed
    expect(drawer.opened).toBeFalse();
  });

  it('should navigate when a dynamically generated link is clicked', () => {
  const navLinks = fixture.nativeElement.querySelectorAll('a[mat-list-item]');
  const firstNavLink = navLinks[0];

  // Simulate a click event on the first link
  firstNavLink.click();
  fixture.detectChanges();

  // Verify that the Router's navigate method was called with the correct route
  const expectedRoute = component.sidebarLinks[0].route;
  expect(component.router.navigate).toHaveBeenCalledWith([expectedRoute]);
});

  it('should emit an event when a navigation link is clicked', () => {
    spyOn(component.navigationEvent, 'emit');
    const navLink = fixture.nativeElement.querySelector('a[mat-list-item]'); // Adjusted selector

    navLink.click();

    expect(component.navigationEvent.emit).toHaveBeenCalled();
  });
});