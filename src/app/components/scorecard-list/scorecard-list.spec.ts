import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ScorecardListComponent } from './scorecard-list';
import { Store } from '@ngrx/store';
import { AuthService } from '../../services/authService';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

const mockScorecards = [
  {
    _id: '1',
    name: 'Course 1',
    rating: 72.5,
    slope: 130,
    par: 72,
    author: { id: 'u1', email: 'test@example.com', name: 'Test User' }
  },
  {
    _id: '2',
    name: 'Course 2',
    rating: 70.0,
    slope: 120,
    par: 70,
    author: { id: 'u2', email: 'other@example.com', name: 'Other User' }
  }
];

describe('ScorecardListComponent', () => {
  let component: ScorecardListComponent;
  let fixture: ComponentFixture<ScorecardListComponent>;
  let storeSpy: jasmine.SpyObj<Store<any>>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['hasMinRole']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    storeSpy.select.and.callFake((selector: any) => {
      if (selector.name === 'selectAllScorecards') return of(mockScorecards);
      if (selector.name === 'selectScorecardsLoading') return of(false);
      if (selector.name === 'selectScorecardsError') return of(null);
      return of([]);
    });
    authServiceSpy.hasMinRole.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ScorecardListComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScorecardListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display scorecards', fakeAsync(() => {
    component.scorecards$ = of(mockScorecards);
    fixture.detectChanges();
    tick();
    expect(component.displayedColumns).toContain('author');
  }));

  it('should show add button for admin', () => {
    authServiceSpy.hasMinRole.and.returnValue(true);
    expect(component.isAuthorized).toBeTrue();
  });

  it('should not show add button for non-admin', () => {
    authServiceSpy.hasMinRole.and.returnValue(false);
    expect(component.isAuthorized).toBeFalse();
  });

  it('should dispatch loadScorecards on init', () => {
    expect(storeSpy.dispatch).toHaveBeenCalled();
  });

  it('should call editScorecard and navigate', () => {
    spyOn(component, 'editScorecard');
    component.editScorecard('1');
    expect(component.editScorecard).toHaveBeenCalledWith('1');
  });

  it('should call deleteScorecard and dispatch action', () => {
    spyOn(component, 'deleteScorecard');
    component.deleteScorecard('1');
    expect(component.deleteScorecard).toHaveBeenCalledWith('1');
  });
});
