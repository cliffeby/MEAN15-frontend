import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Scorecard } from '../../services/scorecardService';
import * as ScorecardActions from '../actions/scorecard.actions';

export interface ScorecardState extends EntityState<Scorecard> {
  loading: boolean;
  error: string | null;
  currentScorecard: Scorecard | null;
}

export const adapter: EntityAdapter<Scorecard> = createEntityAdapter<Scorecard>({
  selectId: (scorecard: Scorecard) => scorecard._id!,
  sortComparer: (a: Scorecard, b: Scorecard) => {
    // Sort by name, then by groupName
    const nameA = a.name || '';
    const nameB = b.name || '';
    const groupA = a.groupName || '';
    const groupB = b.groupName || '';
    
    if (nameA !== nameB) {
      return nameA.localeCompare(nameB);
    }
    return groupA.localeCompare(groupB);
  }
});

export const initialState: ScorecardState = adapter.getInitialState({
  loading: false,
  error: null,
  currentScorecard: null
});

export const scorecardReducer = createReducer(
  initialState,

  // Load all scorecards
  on(ScorecardActions.loadScorecards, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ScorecardActions.loadScorecardsSuccess, (state, { scorecards }) =>
    adapter.setAll(scorecards, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(ScorecardActions.loadScorecardsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load scorecard by ID
  on(ScorecardActions.loadScorecard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ScorecardActions.loadScorecardSuccess, (state, { scorecard }) =>
    adapter.upsertOne(scorecard, {
      ...state,
      loading: false,
      error: null,
      currentScorecard: scorecard
    })
  ),

  on(ScorecardActions.loadScorecardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create scorecard
  on(ScorecardActions.createScorecard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ScorecardActions.createScorecardSuccess, (state, { scorecard }) =>
    adapter.addOne(scorecard, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(ScorecardActions.createScorecardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update scorecard
  on(ScorecardActions.updateScorecard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ScorecardActions.updateScorecardSuccess, (state, { scorecard }) =>
    adapter.updateOne(
      { id: scorecard._id!, changes: scorecard },
      {
        ...state,
        loading: false,
        error: null,
        currentScorecard: state.currentScorecard?._id === scorecard._id ? scorecard : state.currentScorecard
      }
    )
  ),

  on(ScorecardActions.updateScorecardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete scorecard
  on(ScorecardActions.deleteScorecard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ScorecardActions.deleteScorecardSuccess, (state, { id }) =>
    adapter.removeOne(id, {
      ...state,
      loading: false,
      error: null,
      currentScorecard: state.currentScorecard?._id === id ? null : state.currentScorecard
    })
  ),

  on(ScorecardActions.deleteScorecardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear current scorecard
  on(ScorecardActions.clearCurrentScorecard, (state) => ({
    ...state,
    currentScorecard: null
  })),

  // Set current scorecard
  on(ScorecardActions.setCurrentScorecard, (state, { scorecard }) => ({
    ...state,
    currentScorecard: scorecard
  }))
);