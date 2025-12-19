import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MatchService } from '../../services/matchService';
import { AuthService } from '../../services/authService';
import * as MatchActions from '../actions/match.actions';
import { mergeMap, map, catchError, tap, filter } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Injectable()
export class MatchEffects {
  constructor(
    private actions$: Actions, 
    private matchService: MatchService,
    private router: Router,
    private snackBar: MatSnackBar,
    private confirmDialog: ConfirmDialogService,
    private authService: AuthService
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
      mergeMap((action) => {
        return this.matchService.create(action.match).pipe(
          map((response) => {
            const match = response.match || response;
            return MatchActions.createMatchSuccess({ match });
          }),
          catchError((error) => of(MatchActions.createMatchFailure({ error })))
        );
      })
    )
  );

  // Update match
  updateMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.updateMatch),
      mergeMap((action) => {
        return this.matchService.update(action.id, action.match).pipe(
          map((response) => {
            const match = response.match || response;
            return MatchActions.updateMatchSuccess({ match });
          }),
          catchError((error) => of(MatchActions.updateMatchFailure({ error })))
        );
      })
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
          catchError((error) => {
            console.log('Delete match error:', error);
            // Handle 409 conflict specially
            if (error && error.status === 409) {
              console.log('409 conflict detected:', error.error);
              return of(MatchActions.deleteMatchConflict({ 
                id: action.id, 
                conflict: error.error 
              }));
            }
            return of(MatchActions.deleteMatchFailure({ error }));
          })
        )
      )
    )
  );

  // Delete match with action (force delete)
  deleteMatchWithAction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.deleteMatchWithAction),
      mergeMap((action) =>
        this.matchService.deleteWithAction(action.id, action.action).pipe(
          map(() => MatchActions.deleteMatchSuccess({ id: action.id })),
          catchError((error) => of(MatchActions.deleteMatchFailure({ error })))
        )
      )
    )
  );

  // Handle delete conflict - show dialog to user
  deleteMatchConflict$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MatchActions.deleteMatchConflict),
      mergeMap((action) => {
        console.log('Handling delete conflict for match:', action.id, action.conflict);
        const conflictData = {
          title: 'Cannot Delete Match',
          message: `This match has ${action.conflict.conflictCount} associated scores that would become orphaned.`,
          conflictDetails: action.conflict
        };
        
        return this.confirmDialog.resolveConflict(conflictData).pipe(
          map(result => {
            console.log('Conflict dialog result:', result);
            if (result && (result.action === 'nullify' || result.action === 'delete')) {
              return MatchActions.deleteMatchWithAction({ 
                id: action.id, 
                action: result.action 
              });
            }
            // User cancelled or closed dialog - clear conflict from state
            return MatchActions.deleteMatchFailure({ 
              error: 'User cancelled deletion' 
            });
          }),
          catchError((dialogError) => {
            console.error('Error in conflict dialog:', dialogError);
            // Handle any errors in opening the dialog
            return of(MatchActions.deleteMatchFailure({ 
              error: 'Error opening conflict resolution dialog' 
            }));
          })
        );
      })
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