import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MainLayoutComponent } from './main-layout';
import { AuthService } from '../services/authService';
import { of } from 'rxjs';


describe('MainLayout', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
    const mockAuth = { logout: () => {}, get role() { return 'admin'; } } as Partial<AuthService> as AuthService;
    const robustActivatedRoute = {
      params: of({}),
      queryParams: of({}),
      data: of({}),
      snapshot: { paramMap: { get: () => null, has: () => false, getAll: () => [], keys: [] } }
    };

    await TestBed.configureTestingModule({
      imports: [
        MainLayoutComponent       
      ],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: ActivatedRoute, useValue: robustActivatedRoute },
        { provide: 'MatIconRegistry', useValue: {} },
        { provide: 'Overlay', useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
