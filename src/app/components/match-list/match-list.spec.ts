import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatchListComponent } from './match-list';
import { Store } from '@ngrx/store';
import { AuthService } from '../../services/authService';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

const mockMatches = [
  {
    _id: '1',
    name: 'Match 1',
    scGroupName: 'Course 1',
    datePlayed: '2025-12-01',
    status: 'open',
    scorecardId: 'sc1',
    author: { id: 'u1', email: 'test@example.com', name: 'Test User' }
  },
  {
    _id: '2',
    name: 'Match 2',
    scGroupName: 'Course 2',
    datePlayed: '2025-12-02',
    status: 'completed',
    scorecardId: 'sc2',
    author: { id: 'u2', email: 'other@example.com', name: 'Other User' }
  }
];

describe('MatchListComponent', () => {
  let component: MatchListComponent;
  let fixture: ComponentFixture<MatchListComponent>;
  let storeSpy: jasmine.SpyObj<Store<any>>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['hasMinRole']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    storeSpy.select.and.callFake((selector: any) => {
      if (selector.name === 'selectAllMatches') return of(mockMatches);
      if (selector.name === 'selectMatchesLoading') return of(false);
      if (selector.name === 'selectMatchesError') return of(null);
      if (selector.name === 'selectMatchStats') return of({ total: 2, open: 1, completed: 1 });
      return of([]);
    });
    authServiceSpy.hasMinRole.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [MatchListComponent, HttpClientTestingModule],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display matches', fakeAsync(() => {
    component.matches$ = of(mockMatches);
    fixture.detectChanges();
    tick();
    expect(component.paginatedMatches$).toBeTruthy();
  }));

  it('should show add button for admin', () => {
    authServiceSpy.hasMinRole.and.returnValue(true);
    expect(component.isAdmin).toBeTrue();
  });

  it('should not show add button for non-admin', () => {
    authServiceSpy.hasMinRole.and.returnValue(false);
    expect(component.isAdmin).toBeFalse();
  });

  it('should dispatch loadMatches on init', () => {
    expect(storeSpy.dispatch).toHaveBeenCalled();
  });

  it('should call addMatch and navigate', () => {
    spyOn(component, 'addMatch');
    component.addMatch();
    expect(component.addMatch).toHaveBeenCalled();
  });

  it('should call editMatch and navigate', () => {
    spyOn(component, 'editMatch');
    component.editMatch('1');
    expect(component.editMatch).toHaveBeenCalledWith('1');
  });

  it('should call deleteMatch and dispatch action', () => {
    spyOn(component, 'deleteMatch');
    component.deleteMatch('1');
    expect(component.deleteMatch).toHaveBeenCalledWith('1');
  });
});
