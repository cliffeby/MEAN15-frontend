import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatchListComponent } from './match-list';
import { Store } from '@ngrx/store';
import { AuthService } from '../../services/authService';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
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
    authServiceSpy = jasmine.createSpyObj('AuthService', ['hasMinRole', 'getAuthorObject']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    storeSpy.select.and.callFake((selector: any) => {
      // Always return mockMatches for any selector that could be used for paginatedMatches$
      if (selector.name === 'selectAllMatches' || selector.name === 'selectPaginatedMatches' || selector === 'selectAllMatches' || selector === 'selectPaginatedMatches') return of(mockMatches);
      if (selector.name === 'selectMatchesLoading') return of(false);
      if (selector.name === 'selectMatchesError') return of(null);
      if (selector.name === 'selectMatchStats') return of({ total: 2, open: 1, completed: 1 });
      if (selector.name === 'selectMatchById') return of(mockMatches[0]);
      return of([]);
    });
    authServiceSpy.hasMinRole.and.returnValue(true);
    authServiceSpy.getAuthorObject.and.returnValue({ id: 'u1', email: 'test@example.com', name: 'Test User' });

    await TestBed.configureTestingModule({
      imports: [MatchListComponent, HttpClientTestingModule],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    storeSpy.dispatch.calls.reset();
    routerSpy.navigate.calls.reset();
    snackBarSpy.open.calls.reset();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  xit('should display matches in paginatedMatches$', (done) => {
    component.pageIndex = 0;
    component.pageSize = mockMatches.length;
    component.ngOnInit();
    component.paginatedMatches$.subscribe(matches => {
      expect(matches.length).toBe(2);
      expect(matches[1].name).toBe('Match 2');
      done();
    });
  });

  it('should show add button for authorized user', () => {
    authServiceSpy.hasMinRole.and.returnValue(true);
    expect(component.isAuthorized).toBeTrue();
  });

  it('should not show add button for unauthorized user', () => {
    authServiceSpy.hasMinRole.and.returnValue(false);
    expect(component.isAuthorized).toBeFalse();
  });

  it('should dispatch loadMatches on init', () => {
    component.ngOnInit();
    expect(storeSpy.dispatch).toHaveBeenCalledWith(jasmine.objectContaining({ type: '[Match] Load Matches' }));
  });

  it('should call addMatch and navigate if authorized', () => {
    authServiceSpy.hasMinRole.and.returnValue(true);
    component.addMatch();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/matches/add']);
  });

  it('should not navigate on addMatch if unauthorized', () => {
    authServiceSpy.hasMinRole.and.returnValue(false);
    component.addMatch();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should call editMatch and navigate if authorized', () => {
    authServiceSpy.hasMinRole.and.returnValue(true);
    component.pageIndex = 1;
    component.pageSize = 10;
    component.editMatch('1');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/matches/edit', '1'], { queryParams: { pageIndex: 1, pageSize: 10 } });
  });

  it('should not navigate on editMatch if unauthorized', () => {
    authServiceSpy.hasMinRole.and.returnValue(false);
    component.editMatch('1');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should call deleteMatch and dispatch action if authorized', () => {
    authServiceSpy.hasMinRole.and.returnValue(true);
    spyOn(component['confirmDialog'], 'confirmDelete').and.returnValue(of(true));
    component.deleteMatch('1');
    expect(storeSpy.dispatch).toHaveBeenCalledWith(jasmine.objectContaining({ type: '[Match] Delete Match' }));
  });

  it('should not dispatch deleteMatch if unauthorized', () => {
    authServiceSpy.hasMinRole.and.returnValue(false);
    component.deleteMatch('1');
    expect(storeSpy.dispatch).not.toHaveBeenCalledWith(jasmine.objectContaining({ type: jasmine.stringMatching(/deleteMatch/i) }));
  });

  // it('should update pagination on page change', () => {
  //   spyOn(component, 'setupPagination');
  //   component.onPageChange({ pageIndex: 2, pageSize: 20 } as any);
  //   expect(component.pageIndex).toBe(2);
  //   expect(component.pageSize).toBe(20);
  //   expect(component.setupPagination).toHaveBeenCalled();
  // });
});
