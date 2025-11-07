import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MatchService } from '../../services/matchService';
import * as MatchActions from '../actions/match.actions';
import { mergeMap, map, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class MatchEffects {
  constructor(
    private actions$: Actions, 
    private matchService: MatchService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  // Load all matches
  loadMatches$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.loadMatches),
      mergeMap(() =>
        this.matchService.getAll().pipe(
          map((response) => {
            const matches = response.matches || response;
            return MatchActions.loadMatchesSuccess({ matches });
          }),
          catchError((error) => of(MatchActions.loadMatchesFailure({ error })))
        )
      )
    )
  );

  // Load single match
  loadMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.loadMatch),
      mergeMap((action) =>
        this.matchService.getById(action.id).pipe(
          map((response) => {
            const match = response.match || response;
            return MatchActions.loadMatchSuccess({ match });
          }),
          catchError((error) => of(MatchActions.loadMatchFailure({ error })))
        )
      )
    )
  );

  // Create match
  createMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.createMatch),
      mergeMap((action) =>
        this.matchService.create(action.match).pipe(
          map((response) => {
            const match = response.match || response;
            return MatchActions.createMatchSuccess({ match });
          }),
          catchError((error) => of(MatchActions.createMatchFailure({ error })))
        )
      )
    )
  );

  // Update match
  updateMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.updateMatch),
      mergeMap((action) =>
        this.matchService.update(action.id, action.match).pipe(
          map((response) => {
            const match = response.match || response;
            return MatchActions.updateMatchSuccess({ match });
          }),
          catchError((error) => of(MatchActions.updateMatchFailure({ error })))
        )
      )
    )
  );

  // Update match status
  updateMatchStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.updateMatchStatus),
      mergeMap((action) =>
        this.matchService.updateMatchStatus(action.id, action.status).pipe(
          map((response) => {
            const match = response.match || response;
            return MatchActions.updateMatchStatusSuccess({ match });
          }),
          catchError((error) => of(MatchActions.updateMatchStatusFailure({ error })))
        )
      )
    )
  );

  // Delete match
  deleteMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.deleteMatch),
      mergeMap((action) =>
        this.matchService.delete(action.id).pipe(
          map(() => MatchActions.deleteMatchSuccess({ id: action.id })),
          catchError((error) => of(MatchActions.deleteMatchFailure({ error })))
        )
      )
    )
  );

  // Load matches by user
  loadMatchesByUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.loadMatchesByUser),
      mergeMap((action) =>
        this.matchService.getMatchesByUser(action.userId).pipe(
          map((response) => {
            const matches = response.matches || response;
            return MatchActions.loadMatchesByUserSuccess({ matches });
          }),
          catchError((error) => of(MatchActions.loadMatchesByUserFailure({ error })))
        )
      )
    )
  );

  // Load matches by status
  loadMatchesByStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.loadMatchesByStatus),
      mergeMap((action) =>
        this.matchService.getMatchesByStatus(action.status).pipe(
          map((response) => {
            const matches = response.matches || response;
            return MatchActions.loadMatchesByStatusSuccess({ matches });
          }),
          catchError((error) => of(MatchActions.loadMatchesByStatusFailure({ error })))
        )
      )
    )
  );

  // Success notifications and navigation
  createMatchSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.createMatchSuccess),
      tap(() => {
        this.snackBar.open('Match created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/matches']);
      })
    ),
    { dispatch: false }
  );

  updateMatchSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.updateMatchSuccess),
      tap(() => {
        this.snackBar.open('Match updated successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/matches']);
      })
    ),
    { dispatch: false }
  );

  updateMatchStatusSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.updateMatchStatusSuccess),
      tap(() => {
        this.snackBar.open('Match status updated!', 'Close', { duration: 2000 });
      })
    ),
    { dispatch: false }
  );

  deleteMatchSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.deleteMatchSuccess),
      tap(() => {
        this.snackBar.open('Match deleted successfully!', 'Close', { duration: 2000 });
      })
    ),
    { dispatch: false }
  );

  // Error notifications
  matchError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        MatchActions.loadMatchesFailure,
        MatchActions.loadMatchFailure,
        MatchActions.createMatchFailure,
        MatchActions.updateMatchFailure,
        MatchActions.updateMatchStatusFailure,
        MatchActions.deleteMatchFailure,
        MatchActions.loadMatchesByUserFailure,
        MatchActions.loadMatchesByStatusFailure
      ),
      tap((action) => {
        const errorMessage = action.error?.message || 'An error occurred';
        this.snackBar.open(`Error: ${errorMessage}`, 'Close', { 
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      })
    ),
    { dispatch: false }
  );
}