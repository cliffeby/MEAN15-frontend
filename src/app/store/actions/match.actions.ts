import { createAction, props } from '@ngrx/store';
import { Match } from '../../models/match';

// Load all matches
export const loadMatches = createAction('[Match] Load Matches');
export const loadMatchesSuccess = createAction('[Match] Load Matches Success', props<{ matches: Match[] }>());
export const loadMatchesFailure = createAction('[Match] Load Matches Failure', props<{ error: any }>());

// Load single match by ID
export const loadMatch = createAction('[Match] Load Match', props<{ id: string }>());
export const loadMatchSuccess = createAction('[Match] Load Match Success', props<{ match: Match }>());
export const loadMatchFailure = createAction('[Match] Load Match Failure', props<{ error: any }>());

// Create
export const createMatch = createAction('[Match] Create Match', props<{ match: Match }>());
export const createMatchSuccess = createAction('[Match] Create Match Success', props<{ match: Match }>());
export const createMatchFailure = createAction('[Match] Create Match Failure', props<{ error: any }>());

// Update
export const updateMatch = createAction(
  '[Match] Update Match',
  props<{ id: string; match: Match }>()
);
export const updateMatchSuccess = createAction('[Match] Update Match Success', props<{ match: Match }>());
export const updateMatchFailure = createAction('[Match] Update Match Failure', props<{ error: any }>());

// Update status
export const updateMatchStatus = createAction(
  '[Match] Update Match Status',
  props<{ id: string; status: string; name?: string; author?: any }>()
);
export const updateMatchStatusSuccess = createAction('[Match] Update Match Status Success', props<{ match: Match }>());
export const updateMatchStatusFailure = createAction('[Match] Update Match Status Failure', props<{ error: any }>());

// Delete
export const deleteMatch = createAction('[Match] Delete Match', props<{ id: string }>());
export const deleteMatchSuccess = createAction('[Match] Delete Match Success', props<{ id: string }>());
export const deleteMatchFailure = createAction('[Match] Delete Match Failure', props<{ error: any }>());
export const deleteMatchConflict = createAction('[Match] Delete Match Conflict', props<{ id: string; conflict: any }>());
export const deleteMatchWithAction = createAction('[Match] Delete Match With Action', props<{ id: string; action: 'nullify' | 'delete' }>());

// Load matches by user
export const loadMatchesByUser = createAction('[Match] Load Matches By User', props<{ userId: string }>());
export const loadMatchesByUserSuccess = createAction('[Match] Load Matches By User Success', props<{ matches: Match[] }>());
export const loadMatchesByUserFailure = createAction('[Match] Load Matches By User Failure', props<{ error: any }>());

// Load matches by status
export const loadMatchesByStatus = createAction('[Match] Load Matches By Status', props<{ status: string }>());
export const loadMatchesByStatusSuccess = createAction('[Match] Load Matches By Status Success', props<{ matches: Match[] }>());
export const loadMatchesByStatusFailure = createAction('[Match] Load Matches By Status Failure', props<{ error: any }>());

// Clear current match (for form reset)
export const clearCurrentMatch = createAction('[Match] Clear Current Match');