import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';

import { MainLayoutComponent } from './main-layout';
import { Auth } from '../services/auth';
import { of } from 'rxjs';

describe('MainLayout', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
  const mockAuth = { logout: () => {} } as Partial<Auth> as Auth;
  const mockRouter = { navigate: (commands: any[]) => Promise.resolve(true) } as Partial<Router> as Router;
    const mockActivatedRoute = {
      params: of({}),
      queryParams: of({}),
      data: of({})
    };

    const robustActivatedRoute = {
      params: of({}),
      queryParams: of({}),
      data: of({}),
      snapshot: { paramMap: { get: () => null, has: () => false, getAll: () => [], keys: [] } }
    };


    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([
          { path: '**', component: class DummyComponent {} }
        ]),
        { provide: Auth, useValue: mockAuth },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: robustActivatedRoute }
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
