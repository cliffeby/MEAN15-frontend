import { matchReducer, initialState, MatchState } from './match.reducer';
import * as MatchActions from '../actions/match.actions';
import { Match } from '../../models/match';

// Mock data
const mockMatch: Match = {
  _id: '1',
  name: 'Test Match',
  datePlayed: '2025-12-17',
  status: 'active', // Add a valid status value according to your Match model
  author: { id: 'u1', email: 'user1@example.com', name: 'User One' },
};

describe('matchReducer', () => {
  it('should return the initial state', () => {
    const state = matchReducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual(initialState);
  });

  it('should set loading true on loadMatches', () => {
    const state = matchReducer(initialState, MatchActions.loadMatches());
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should add matches on loadMatchesSuccess', () => {
    const matches = [mockMatch];
    const state = matchReducer(initialState, MatchActions.loadMatchesSuccess({ matches }));
    expect(state.entities['1']).toEqual(mockMatch);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set error on loadMatchesFailure', () => {
    const error = 'Failed to load';
    const state = matchReducer(initialState, MatchActions.loadMatchesFailure({ error }));
    expect(state.error).toBe(error);
    expect(state.loading).toBe(false);
  });

  it('should set currentMatch on loadMatchSuccess', () => {
    const state = matchReducer(initialState, MatchActions.loadMatchSuccess({ match: mockMatch }));
    expect(state.currentMatch).toEqual(mockMatch);
    expect(state.loading).toBe(false);
  });

  it('should add a match on createMatchSuccess', () => {
    const state = matchReducer(initialState, MatchActions.createMatchSuccess({ match: mockMatch }));
    expect(state.entities['1']).toEqual(mockMatch);
    expect(state.loading).toBe(false);
  });

  it('should update a match on updateMatchSuccess', () => {
    const withMatch = matchReducer(
      initialState,
      MatchActions.createMatchSuccess({ match: mockMatch })
    );
    const updated = { ...mockMatch, name: 'Updated' };
    const state = matchReducer(withMatch, MatchActions.updateMatchSuccess({ match: updated }));
    expect(state.entities['1']).toEqual(updated);
    expect(state.currentMatch).toEqual(updated);
  });

  it('should remove a match on deleteMatchSuccess', () => {
    const withMatch = matchReducer(
      initialState,
      MatchActions.createMatchSuccess({ match: mockMatch })
    );
    const state = matchReducer(withMatch, MatchActions.deleteMatchSuccess({ id: '1' }));
    expect(state.entities['1']).toBeUndefined();
  });

  it('should set filterByUser on loadMatchesByUser', () => {
    const state = matchReducer(initialState, MatchActions.loadMatchesByUser({ userId: 'user1' }));
    expect(state.filterByUser).toBe('user1');
    expect(state.filterByStatus).toBeNull();
  });

  it('should set filterByStatus on loadMatchesByStatus', () => {
    const state = matchReducer(
      initialState,
      MatchActions.loadMatchesByStatus({ status: 'active' })
    );
    expect(state.filterByStatus).toBe('active');
    expect(state.filterByUser).toBeNull();
  });

  it('should clear currentMatch on clearCurrentMatch', () => {
    const withCurrent = { ...initialState, currentMatch: mockMatch };
    const state = matchReducer(withCurrent, MatchActions.clearCurrentMatch());
    expect(state.currentMatch).toBeNull();
  });
});
