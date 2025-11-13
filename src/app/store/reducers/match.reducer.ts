import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import * as MatchActions from '../actions/match.actions';
import { Match } from '../../models/match';

// State definition
export interface MatchState extends EntityState<Match> {
  loading: boolean;
  error: any | null;
  currentMatch: Match | null;
  filterByUser: string | null;
  filterByStatus: string | null;
  deleteConflict: any | null;
}

// Entity adapter
export const adapter: EntityAdapter<Match> = createEntityAdapter<Match>({
  selectId: (match: Match) => match._id || match.id || '',
  sortComparer: (a: Match, b: Match) => {
    // Sort by date played (newest first), then by name
    const dateA = new Date(a.datePlayed || 0).getTime();
    const dateB = new Date(b.datePlayed || 0).getTime();
    if (dateA !== dateB) {
      return dateB - dateA; // Newest first
    }
    return (a.name || '').localeCompare(b.name || '');
  }
});

// Initial state
export const initialState: MatchState = adapter.getInitialState({
  loading: false,
  error: null,
  currentMatch: null,
  filterByUser: null,
  filterByStatus: null,
  deleteConflict: null,
});

// Reducer
export const matchReducer = createReducer(
  initialState,

  // Load all matches
  on(MatchActions.loadMatches, (state) => ({ 
    ...state, 
    loading: true, 
    error: null,
    filterByUser: null,
    filterByStatus: null 
  })),
  on(MatchActions.loadMatchesSuccess, (state, { matches }) =>
    adapter.setAll(matches, { ...state, loading: false, error: null })
  ),
  on(MatchActions.loadMatchesFailure, (state, { error }) => ({ 
    ...state, 
    loading: false, 
    error 
  })),

  // Load single match
  on(MatchActions.loadMatch, (state) => ({ 
    ...state, 
    loading: true, 
    error: null 
  })),
  on(MatchActions.loadMatchSuccess, (state, { match }) => ({
    ...state,
    loading: false,
    error: null,
    currentMatch: match
  })),
  on(MatchActions.loadMatchFailure, (state, { error }) => ({ 
    ...state, 
    loading: false, 
    error,
    currentMatch: null 
  })),

  // Create match
  on(MatchActions.createMatch, (state) => ({ 
    ...state, 
    loading: true, 
    error: null 
  })),
  on(MatchActions.createMatchSuccess, (state, { match }) =>
    adapter.addOne(match, { ...state, loading: false, error: null })
  ),
  on(MatchActions.createMatchFailure, (state, { error }) => ({ 
    ...state, 
    loading: false, 
    error 
  })),

  // Update match
  on(MatchActions.updateMatch, (state) => ({ 
    ...state, 
    loading: true, 
    error: null 
  })),
  on(MatchActions.updateMatchSuccess, (state, { match }) =>
    adapter.upsertOne(match, { 
      ...state, 
      loading: false, 
      error: null,
      currentMatch: match 
    })
  ),
  on(MatchActions.updateMatchFailure, (state, { error }) => ({ 
    ...state, 
    loading: false, 
    error 
  })),

  // Update match status
  on(MatchActions.updateMatchStatus, (state) => ({ 
    ...state, 
    loading: true, 
    error: null 
  })),
  on(MatchActions.updateMatchStatusSuccess, (state, { match }) =>
    adapter.upsertOne(match, { ...state, loading: false, error: null })
  ),
  on(MatchActions.updateMatchStatusFailure, (state, { error }) => ({ 
    ...state, 
    loading: false, 
    error 
  })),

  // Delete match
  on(MatchActions.deleteMatch, (state) => ({ 
    ...state, 
    loading: true, 
    error: null,
    deleteConflict: null 
  })),
  on(MatchActions.deleteMatchSuccess, (state, { id }) =>
    adapter.removeOne(id, { ...state, loading: false, error: null, deleteConflict: null })
  ),
  on(MatchActions.deleteMatchFailure, (state, { error }) => ({ 
    ...state, 
    loading: false, 
    error,
    deleteConflict: null 
  })),
  on(MatchActions.deleteMatchConflict, (state, { conflict }) => ({ 
    ...state, 
    loading: false, 
    error: null,
    deleteConflict: conflict
  })),
  on(MatchActions.deleteMatchWithAction, (state) => ({ 
    ...state, 
    loading: true, 
    error: null,
    deleteConflict: null
  })),

  // Load matches by user
  on(MatchActions.loadMatchesByUser, (state, { userId }) => ({ 
    ...state, 
    loading: true, 
    error: null,
    filterByUser: userId,
    filterByStatus: null 
  })),
  on(MatchActions.loadMatchesByUserSuccess, (state, { matches }) =>
    adapter.setAll(matches, { ...state, loading: false, error: null })
  ),
  on(MatchActions.loadMatchesByUserFailure, (state, { error }) => ({ 
    ...state, 
    loading: false, 
    error 
  })),

  // Load matches by status
  on(MatchActions.loadMatchesByStatus, (state, { status }) => ({ 
    ...state, 
    loading: true, 
    error: null,
    filterByStatus: status,
    filterByUser: null 
  })),
  on(MatchActions.loadMatchesByStatusSuccess, (state, { matches }) =>
    adapter.setAll(matches, { ...state, loading: false, error: null })
  ),
  on(MatchActions.loadMatchesByStatusFailure, (state, { error }) => ({ 
    ...state, 
    loading: false, 
    error 
  })),

  // Clear current match
  on(MatchActions.clearCurrentMatch, (state) => ({
    ...state,
    currentMatch: null,
    error: null
  }))
);

// Export selectors
export const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal,
} = adapter.getSelectors();