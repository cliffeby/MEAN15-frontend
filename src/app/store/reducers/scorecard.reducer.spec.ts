import { scorecardReducer, initialState } from './scorecard.reducer';
import * as ScorecardActions from '../actions/scorecard.actions';
import { Scorecard } from '../../models/scorecard.interface';

describe('scorecardReducer', () => {
  const mockScorecard: Scorecard = {
    _id: '1',
    name: 'Test Scorecard',
    groupName: 'A',
  };

  it('should return the initial state', () => {
    const state = scorecardReducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual(initialState);
  });

  it('should set loading true on loadScorecards', () => {
    const state = scorecardReducer(initialState, ScorecardActions.loadScorecards());
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should add scorecards on loadScorecardsSuccess', () => {
    const scorecards = [mockScorecard];
    const state = scorecardReducer(initialState, ScorecardActions.loadScorecardsSuccess({ scorecards }));
    expect(state.entities['1']).toEqual(mockScorecard);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set error on loadScorecardsFailure', () => {
    const error = 'Failed to load';
    const state = scorecardReducer(initialState, ScorecardActions.loadScorecardsFailure({ error }));
    expect(state.error).toBe(error);
    expect(state.loading).toBe(false);
  });

  it('should set currentScorecard on loadScorecardSuccess', () => {
    const state = scorecardReducer(initialState, ScorecardActions.loadScorecardSuccess({ scorecard: mockScorecard }));
    expect(state.currentScorecard).toEqual(mockScorecard);
    expect(state.loading).toBe(false);
  });

  it('should add a scorecard on createScorecardSuccess', () => {
    const state = scorecardReducer(initialState, ScorecardActions.createScorecardSuccess({ scorecard: mockScorecard }));
    expect(state.entities['1']).toEqual(mockScorecard);
    expect(state.loading).toBe(false);
  });

  it('should update a scorecard on updateScorecardSuccess', () => {
    const withScorecard = scorecardReducer(initialState, ScorecardActions.createScorecardSuccess({ scorecard: mockScorecard }));
    const updated = { ...mockScorecard, name: 'Updated' };
    const state = scorecardReducer(withScorecard, ScorecardActions.updateScorecardSuccess({ scorecard: updated }));
    expect(state.entities['1']).toEqual(updated);
  });

  it('should remove a scorecard on deleteScorecardSuccess', () => {
    const withScorecard = scorecardReducer(initialState, ScorecardActions.createScorecardSuccess({ scorecard: mockScorecard }));
    const state = scorecardReducer(withScorecard, ScorecardActions.deleteScorecardSuccess({ id: '1', name: 'Test Scorecard', authorName: 'Tester' }));
    expect(state.entities['1']).toBeUndefined();
  });

  it('should clear currentScorecard on clearCurrentScorecard', () => {
    const withCurrent = { ...initialState, currentScorecard: mockScorecard };
    const state = scorecardReducer(withCurrent, ScorecardActions.clearCurrentScorecard());
    expect(state.currentScorecard).toBeNull();
  });

  it('should set currentScorecard on setCurrentScorecard', () => {
    const state = scorecardReducer(initialState, ScorecardActions.setCurrentScorecard({ scorecard: mockScorecard }));
    expect(state.currentScorecard).toEqual(mockScorecard);
  });
});
