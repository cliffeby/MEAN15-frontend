import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject, of, throwError } from 'rxjs';
import { ScorecardEffects } from './scorecard.effects';
import { ScorecardService } from '../../services/scorecardService';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as ScorecardActions from '../actions/scorecard.actions';

describe('ScorecardEffects', () => {
  let actions$!: Subject<any>;
  let effects: ScorecardEffects;
  let scorecardService: jasmine.SpyObj<ScorecardService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: jasmine.SpyObj<Router>;

  const mockScorecards = [{ _id: 's1', name: 'Round 1' }];

  beforeEach(() => {
    actions$ = new Subject<any>();

    const svc = jasmine.createSpyObj('ScorecardService', [
      'getAll', 'getById', 'create', 'update', 'delete'
    ]);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        ScorecardEffects,
        provideMockActions(() => actions$.asObservable()),
        { provide: ScorecardService, useValue: svc },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router }
      ]
    });

    effects = TestBed.inject(ScorecardEffects);
    scorecardService = TestBed.inject(ScorecardService) as jasmine.SpyObj<ScorecardService>;
  });

  afterEach(() => {
    actions$.complete();
  });

  it('loadScorecards$ -> loadScorecardsSuccess on success', (done) => {
    scorecardService.getAll.and.returnValue(of({ scorecards: mockScorecards }));

    effects.loadScorecards$.subscribe(action => {
      expect(action).toEqual(ScorecardActions.loadScorecardsSuccess({ scorecards: mockScorecards }));
      done();
    });

    actions$.next(ScorecardActions.loadScorecards());
  });

  it('loadScorecards$ -> loadScorecardsFailure on error', (done) => {
    const err = { message: 'nope' };
    scorecardService.getAll.and.returnValue(throwError(() => err));

    effects.loadScorecards$.subscribe(action => {
      // ScorecardEffects maps failure to a string error message
      expect(action).toEqual(ScorecardActions.loadScorecardsFailure({ error: err.message }));
      done();
    });

    actions$.next(ScorecardActions.loadScorecards());
  });

  it('deleteScorecard$ -> deleteScorecardSuccess on success', (done) => {
    scorecardService.delete.and.returnValue(of({ success: true }));

    effects.deleteScorecard$.subscribe(action => {
      expect(action).toEqual(ScorecardActions.deleteScorecardSuccess({ id: 's1' }));
      done();
    });

    actions$.next(ScorecardActions.deleteScorecard({ id: 's1' }));
  });

  it('createScorecardSuccess$ shows snackbar and navigates', (done) => {
    effects.createScorecardSuccess$.subscribe(() => {
      expect(snackBar.open).toHaveBeenCalledWith('Scorecard created successfully!', 'Close', jasmine.any(Object));
      expect(router.navigate).toHaveBeenCalledWith(['/scorecards']);
      done();
    });

    actions$.next(ScorecardActions.createScorecardSuccess({ scorecard: { _id: 'sX' } as any }));
  });

});
