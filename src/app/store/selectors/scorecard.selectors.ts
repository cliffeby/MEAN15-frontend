import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ScorecardState, adapter } from '../reducers/scorecard.reducer';
import { Scorecard } from '../../models/scorecard.interface';

// Feature selector
export const selectScorecardState = createFeatureSelector<ScorecardState>('scorecards');

// Basic selectors from entity adapter
export const {
  selectIds: selectScorecardIds,
  selectEntities: selectScorecardEntities,
  selectAll: selectAllScorecards,
  selectTotal: selectScorecardsTotal,
} = adapter.getSelectors(selectScorecardState);

// Additional state selectors
export const selectScorecardsLoading = createSelector(
  selectScorecardState,
  (state) => state.loading
);

export const selectScorecardsError = createSelector(
  selectScorecardState,
  (state) => state.error
);

export const selectCurrentScorecard = createSelector(
  selectScorecardState,
  (state) => state.currentScorecard
);

// Utility selectors
export const selectScorecardById = (id: string) =>
  createSelector(selectScorecardEntities, (entities) => entities[id] || null);

export const selectScorecardsForDropdown = createSelector(
  selectAllScorecards,
  (scorecards) =>
    scorecards.map(scorecard => ({
      value: scorecard._id!,
      label: `${scorecard.course || scorecard.course || 'Unnamed Scorecard'}${
        scorecard.rating ? ` - Rating: ${scorecard.rating}` : ''
      }${
        scorecard.slope ? ` - Slope: ${scorecard.slope}` : ''
      }`,
      scorecard
    }))
);

export const selectScorecardsWithDetails = createSelector(
  selectAllScorecards,
  (scorecards) =>
    scorecards.map(scorecard => ({
      ...scorecard,
      displayName:  scorecard.course || 'Unnamed Scorecard',
      fullDetails: `${scorecard.course || 'Unnamed'} (Par: ${scorecard.par || 'N/A'}, Rating: ${scorecard.rating || 'N/A'}, Slope: ${scorecard.slope || 'N/A'})`
    }))
);

// Filter selectors
export const selectScorecardsWithRating = createSelector(
  selectAllScorecards,
  (scorecards) => scorecards.filter(sc => sc.rating && sc.rating > 0)
);

export const selectScorecardsWithSlope = createSelector(
  selectAllScorecards,
  (scorecards) => scorecards.filter(sc => sc.slope && sc.slope > 0)
);

export const selectScorecardsSearch = (searchTerm: string) =>
  createSelector(
    selectAllScorecards,
    (scorecards) => {
      if (!searchTerm?.trim()) return scorecards;
      
      const term = searchTerm.toLowerCase().trim();
      return scorecards.filter(sc =>
        // (sc.name?.toLowerCase().includes(term)) ||
        (sc.course?.toLowerCase().includes(term)) ||
        (sc.courseTeeName?.toLowerCase().includes(term))
      );
    }
  );

// Statistics selectors
export const selectScorecardStats = createSelector(
  selectAllScorecards,
  (scorecards) => {
    const stats = {
      total: scorecards.length,
      withRating: 0,
      withSlope: 0,
      averageRating: 0,
      averageSlope: 0,
      averagePar: 0
    };

    if (scorecards.length === 0) return stats;

    let totalRating = 0;
    let totalSlope = 0;
    let totalPar = 0;
    let ratingCount = 0;
    let slopeCount = 0;
    let parCount = 0;

    scorecards.forEach(sc => {
      if (sc.rating && sc.rating > 0) {
        stats.withRating++;
        totalRating += sc.rating;
        ratingCount++;
      }
      if (sc.slope && sc.slope > 0) {
        stats.withSlope++;
        totalSlope += sc.slope;
        slopeCount++;
      }
      if (sc.par && sc.par > 0) {
        totalPar += sc.par;
        parCount++;
      }
    });

    stats.averageRating = ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0;
    stats.averageSlope = slopeCount > 0 ? Math.round((totalSlope / slopeCount) * 10) / 10 : 0;
    stats.averagePar = parCount > 0 ? Math.round((totalPar / parCount) * 10) / 10 : 0;

    return stats;
  }
);

// Combined selectors for complex UI needs
export const selectScorecardListData = createSelector(
  selectAllScorecards,
  selectScorecardsLoading,
  selectScorecardsError,
  (scorecards, loading, error) => ({
    scorecards,
    loading,
    error,
    isEmpty: !loading && scorecards.length === 0
  })
);

export const selectScorecardFormData = createSelector(
  selectCurrentScorecard,
  selectScorecardsLoading,
  selectScorecardsError,
  (currentScorecard, loading, error) => ({
    scorecard: currentScorecard,
    loading,
    error,
    isEditing: !!currentScorecard
  })
);