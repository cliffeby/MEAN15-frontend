import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { map, mergeMap, catchError, tap } from 'rxjs/operators';
import { ScorecardService } from '../../services/scorecardService';
import { AuthService } from '../../services/authService';
import * as ScorecardActions from '../actions/scorecard.actions';

@Injectable()
export class ScorecardEffects {

  constructor(
    private actions$: Actions,
    private scorecardService: ScorecardService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  // Load all scorecards
  loadScorecards$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.loadScorecards),
      mergeMap(() =>
        this.scorecardService.getAll().pipe(
          map((response) => {
            const scorecards = response.scorecards || response;
            return ScorecardActions.loadScorecardsSuccess({ scorecards });
          }),
          catchError((error) => {
            const errorMsg = error.message || 'Failed to load scorecards';
            return of(ScorecardActions.loadScorecardsFailure({ error: errorMsg }));
          })
        )
      )
    )
  );

  // Load scorecard by ID
  loadScorecard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.loadScorecard),
      mergeMap((action) =>
        this.scorecardService.getById(action.id).pipe(
          map((response) => {
            const scorecard = response.scorecard || response;
            return ScorecardActions.loadScorecardSuccess({ scorecard });
          }),
          catchError((error) => {
            const errorMsg = error.message || 'Failed to load scorecard';
            return of(ScorecardActions.loadScorecardFailure({ error: errorMsg }));
          })
        )
      )
    )
  );

  // Create scorecard
  createScorecard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.createScorecard),
      mergeMap((action) => {
        return this.scorecardService.create(action.scorecard).pipe(
          map((response) => {
            const scorecard = response.scorecard || response;
            return ScorecardActions.createScorecardSuccess({ scorecard });
          }),
          catchError((error) => {
            const errorMsg = error.message || 'Failed to create scorecard';
            return of(ScorecardActions.createScorecardFailure({ error: errorMsg }));
          })
        );
      })
    )
  );

  // Update scorecard
  updateScorecard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.updateScorecard),
      mergeMap((action) => {
        return this.scorecardService.update(action.id, action.scorecard).pipe(
          map((response) => {
            const scorecard = response.scorecard || response;
            return ScorecardActions.updateScorecardSuccess({ scorecard });
          }),
          catchError((error) => {
            const errorMsg = error.message || 'Failed to update scorecard';
            return of(ScorecardActions.updateScorecardFailure({ error: errorMsg }));
          })
        );
      })
    )
  );

  // Delete scorecard
  deleteScorecard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.deleteScorecard),
      mergeMap((action) =>
        this.scorecardService.delete(action.id).pipe(
          map(() => ScorecardActions.deleteScorecardSuccess({ id: action.id })),
          catchError((error) => {
            const errorMsg = error.message || 'Failed to delete scorecard';
            return of(ScorecardActions.deleteScorecardFailure({ error: errorMsg }));
          })
        )
      )
    )
  );

  // Success effects with notifications and navigation
  createScorecardSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.createScorecardSuccess),
      tap(() => {
        this.snackBar.open('Scorecard created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/scorecards']);
      })
    ),
    { dispatch: false }
  );

  updateScorecardSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.updateScorecardSuccess),
      tap(() => {
        this.snackBar.open('Scorecard updated successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/scorecards']);
      })
    ),
    { dispatch: false }
  );

  deleteScorecardSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.deleteScorecardSuccess),
      tap(() => {
        this.snackBar.open('Scorecard deleted successfully!', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Error effects
  loadScorecardsFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.loadScorecardsFailure),
      tap(({ error }) => {
        this.snackBar.open(`Error loading scorecards: ${error}`, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  loadScorecardFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.loadScorecardFailure),
      tap(({ error }) => {
        this.snackBar.open(`Error loading scorecard: ${error}`, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  createScorecardFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.createScorecardFailure),
      tap(({ error }) => {
        this.snackBar.open(`Error creating scorecard: ${error}`, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  updateScorecardFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.updateScorecardFailure),
      tap(({ error }) => {
        this.snackBar.open(`Error updating scorecard: ${error}`, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  deleteScorecardFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ScorecardActions.deleteScorecardFailure),
      tap(({ error }) => {
        this.snackBar.open(`Error deleting scorecard: ${error}`, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );
}