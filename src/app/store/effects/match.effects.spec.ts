import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject, of, throwError } from 'rxjs';
import { MatchEffects } from './match.effects';
import { MatchService } from '../../services/matchService';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import * as MatchActions from '../actions/match.actions';

describe('MatchEffects', () => {
  let actions$!: Subject<any>;
  let effects: MatchEffects;
  let matchService: jasmine.SpyObj<MatchService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: jasmine.SpyObj<Router>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  const mockMatches = [{ _id: 'm1', name: 'A', user: 'u1', status: 'active' }, 
    { _id: 'm2', name: 'B', user: 'u2', status: 'inactive' }];

  beforeEach(() => {
    actions$ = new Subject<any>();

    const matchSpy = jasmine.createSpyObj('MatchService', [
      'getAll', 'getById', 'create', 'update', 'updateMatchStatus', 'delete', 'deleteWithAction', 'getMatchesByUser', 'getMatchesByStatus'
    ]);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    confirmDialog = jasmine.createSpyObj('ConfirmDialogService', ['resolveConflict']);

    TestBed.configureTestingModule({
      providers: [
        MatchEffects,
        provideMockActions(() => actions$.asObservable()),
        { provide: MatchService, useValue: matchSpy },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router },
        { provide: ConfirmDialogService, useValue: confirmDialog }
      ]
    });

    effects = TestBed.inject(MatchEffects);
    matchService = TestBed.inject(MatchService) as jasmine.SpyObj<MatchService>;
  });

  afterEach(() => {
    actions$.complete();
  });

  it('loadMatches$ -> loadMatchesSuccess on success', (done) => {
    matchService.getAll.and.returnValue(of({ matches: mockMatches }));

    effects.loadMatches$.subscribe(action => {
      expect(action).toEqual(MatchActions.loadMatchesSuccess({ matches: mockMatches }));
      done();
    });

    actions$.next(MatchActions.loadMatches());
  });

  it('loadMatches$ -> loadMatchesFailure on error', (done) => {
    const err = { message: 'boom' };
    matchService.getAll.and.returnValue(throwError(() => err));

    effects.loadMatches$.subscribe(action => {
      // expect the effect to emit the failure action with the error payload
      expect(action).toEqual(MatchActions.loadMatchesFailure({ error: err }));
      done();
    });

    actions$.next(MatchActions.loadMatches());
  });

  it('deleteMatch$ emits deleteMatchConflict on 409 and deleteMatchConflict$ maps dialog result to deleteMatchWithAction', (done) => {
    const conflict = { conflictCount: 2, details: {} };
    const http409 = { status: 409, error: conflict } as any;

    matchService.delete.and.returnValue(throwError(() => http409));

    // First, observe deleteMatch$ emitting the conflict action
    effects.deleteMatch$.subscribe(action => {
      // assert the full action equals the action creator output (uses `id`, not `_id`)
      expect(action).toEqual(MatchActions.deleteMatchConflict({ id: 'm1', conflict }));

      // Now mock the dialog result and trigger the deleteMatchConflict$ effect
      confirmDialog.resolveConflict.and.returnValue(of({ action: 'nullify' }));

      effects.deleteMatchConflict$.subscribe(nextAction => {
        expect(nextAction).toEqual(MatchActions.deleteMatchWithAction({ id: 'm1', action: 'nullify' }));
        done();
      });

      // Emit the conflict action into the actions stream to drive the second effect.
      actions$.next(MatchActions.deleteMatchConflict({ id: 'm1', conflict }));
    });

    // Kick off the deleteMatch action which will cause the first effect to run
    actions$.next(MatchActions.deleteMatch({ id: 'm1' }));
  });

  it('createMatchSuccess$ shows snackbar and navigates', (done) => {
    effects.createMatchSuccess$.subscribe(() => {
      expect(snackBar.open).toHaveBeenCalledWith('Match created successfully!', 'Close', jasmine.any(Object));
      expect(router.navigate).toHaveBeenCalledWith(['/matches']);
      done();
    });

    actions$.next(MatchActions.createMatchSuccess({ match: { _id: 'mX' } as any }));
  });

});
