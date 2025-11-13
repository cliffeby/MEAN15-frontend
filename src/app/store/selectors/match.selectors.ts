import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MatchState, adapter } from '../reducers/match.reducer';
import { Match } from '../../models/match';

// Feature selector
export const selectMatchState = createFeatureSelector<MatchState>('matches');

// Basic selectors from entity adapter
export const {
  selectIds: selectMatchIds,
  selectEntities: selectMatchEntities,
  selectAll: selectAllMatches,
  selectTotal: selectMatchesTotal,
} = adapter.getSelectors(selectMatchState);

// Additional state selectors
export const selectMatchesLoading = createSelector(
  selectMatchState,
  (state) => state.loading
);

export const selectMatchesError = createSelector(
  selectMatchState,
  (state) => state.error
);

export const selectCurrentMatch = createSelector(
  selectMatchState,
  (state) => state.currentMatch
);

export const selectFilterByUser = createSelector(
  selectMatchState,
  (state) => state.filterByUser
);

export const selectFilterByStatus = createSelector(
  selectMatchState,
  (state) => state.filterByStatus
);

export const selectMatchDeleteConflict = createSelector(
  selectMatchState,
  (state) => state.deleteConflict
);

// Advanced selectors
export const selectMatchById = (id: string) => createSelector(
  selectMatchEntities,
  (entities) => entities[id]
);

// Filter matches by status
export const selectMatchesByStatus = (status: string) => createSelector(
  selectAllMatches,
  (matches) => matches.filter((match: Match) => match.status === status)
);

// Filter matches by user
export const selectMatchesByUser = (userId: string) => createSelector(
  selectAllMatches,
  (matches) => matches.filter((match: Match) => match.user === userId)
);

// Get open matches
export const selectOpenMatches = createSelector(
  selectAllMatches,
  (matches) => matches.filter((match: Match) => match.status === 'open')
);

// Get completed matches
export const selectCompletedMatches = createSelector(
  selectAllMatches,
  (matches) => matches.filter((match: Match) => match.status === 'completed')
);

// Get recent matches (last 30 days)
export const selectRecentMatches = createSelector(
  selectAllMatches,
  (matches) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return matches.filter((match: Match) => {
      if (!match.datePlayed) return false;
      const matchDate = new Date(match.datePlayed);
      return matchDate >= thirtyDaysAgo;
    });
  }
);

// Get matches with scorecard
export const selectMatchesWithScorecard = createSelector(
  selectAllMatches,
  (matches) => matches.filter((match: Match) => match.scorecardId)
);

// Get matches without scorecard
export const selectMatchesWithoutScorecard = createSelector(
  selectAllMatches,
  (matches) => matches.filter((match: Match) => !match.scorecardId)
);

// Match statistics
export const selectMatchStats = createSelector(
  selectAllMatches,
  (matches) => {
    const total = matches.length;
    const open = matches.filter(m => m.status === 'open').length;
    const completed = matches.filter(m => m.status === 'completed').length;
    const closed = matches.filter(m => m.status === 'closed').length;
    const cancelled = matches.filter(m => m.status === 'cancelled').length;
    
    return {
      total,
      open,
      completed,
      closed,
      cancelled,
      withScorecard: matches.filter(m => m.scorecardId).length,
      withoutScorecard: matches.filter(m => !m.scorecardId).length
    };
  }
);

// Search matches by name
export const selectMatchesByName = (searchTerm: string) => createSelector(
  selectAllMatches,
  (matches) => {
    if (!searchTerm || searchTerm.trim() === '') {
      return matches;
    }
    
    const term = searchTerm.toLowerCase().trim();
    return matches.filter((match: Match) => 
      match.name?.toLowerCase().includes(term) ||
      match.scGroupName?.toLowerCase().includes(term)
    );
  }
);

// Complex filter selector (multiple criteria)
export const selectFilteredMatches = createSelector(
  selectAllMatches,
  selectFilterByStatus,
  selectFilterByUser,
  (matches, statusFilter, userFilter) => {
    let filtered = matches;
    
    if (statusFilter) {
      filtered = filtered.filter(match => match.status === statusFilter);
    }
    
    if (userFilter) {
      filtered = filtered.filter(match => match.user === userFilter);
    }
    
    return filtered;
  }
);

// Get matches for today
export const selectTodaysMatches = createSelector(
  selectAllMatches,
  (matches) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return matches.filter((match: Match) => {
      if (!match.datePlayed) return false;
      const matchDate = new Date(match.datePlayed);
      return matchDate >= today && matchDate < tomorrow;
    });
  }
);

// Get upcoming matches (future dates)
export const selectUpcomingMatches = createSelector(
  selectAllMatches,
  (matches) => {
    const now = new Date();
    return matches.filter((match: Match) => {
      if (!match.datePlayed) return false;
      const matchDate = new Date(match.datePlayed);
      return matchDate > now;
    }).slice(0, 10); // Limit to next 10 matches
  }
);