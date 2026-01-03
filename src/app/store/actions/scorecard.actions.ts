import { createAction, props } from '@ngrx/store';
import { Scorecard } from '../../models/scorecard.interface';

// Load all scorecards
export const loadScorecards = createAction('[Scorecard] Load Scorecards');

export const loadScorecardsSuccess = createAction(
  '[Scorecard] Load Scorecards Success',
  props<{ scorecards: Scorecard[] }>()
);

export const loadScorecardsFailure = createAction(
  '[Scorecard] Load Scorecards Failure',
  props<{ error: string }>()
);

// Load scorecard by ID
export const loadScorecard = createAction(
  '[Scorecard] Load Scorecard',
  props<{ id: string }>()
);

export const loadScorecardSuccess = createAction(
  '[Scorecard] Load Scorecard Success',
  props<{ scorecard: Scorecard }>()
);

export const loadScorecardFailure = createAction(
  '[Scorecard] Load Scorecard Failure',
  props<{ error: string }>()
);

// Create scorecard
export const createScorecard = createAction(
  '[Scorecard] Create Scorecard',
  props<{ scorecard: Scorecard }>()
);

export const createScorecardSuccess = createAction(
  '[Scorecard] Create Scorecard Success',
  props<{ scorecard: Scorecard }>()
);

export const createScorecardFailure = createAction(
  '[Scorecard] Create Scorecard Failure',
  props<{ error: string }>()
);

// Update scorecard
export const updateScorecard = createAction(
  '[Scorecard] Update Scorecard',
  props<{ id: string; scorecard: Scorecard }>()
);

export const updateScorecardSuccess = createAction(
  '[Scorecard] Update Scorecard Success',
  props<{ scorecard: Scorecard }>()
);

export const updateScorecardFailure = createAction(
  '[Scorecard] Update Scorecard Failure',
  props<{ error: string }>()
);

// Delete scorecard

export const deleteScorecard = createAction(
  '[Scorecard] Delete Scorecard',
  props<{ id: string; name: string; authorName: string }>()
);

export const deleteScorecardSuccess = createAction(
  '[Scorecard] Delete Scorecard Success',
  props<{ id: string; name: string; authorName: string }>()
);

export const deleteScorecardFailure = createAction(
  '[Scorecard] Delete Scorecard Failure',
  props<{ error: string }>()
);

// Clear current scorecard
export const clearCurrentScorecard = createAction(
  '[Scorecard] Clear Current Scorecard'
);

// Set current scorecard
export const setCurrentScorecard = createAction(
  '[Scorecard] Set Current Scorecard',
  props<{ scorecard: Scorecard }>()
);