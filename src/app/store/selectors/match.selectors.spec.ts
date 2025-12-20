import * as fromSelectors from './match.selectors';
import { MatchState } from '../reducers/match.reducer';
import { Match } from '../../models/match';

const mockMatches: Match[] = [
  { _id: '1', name: 'Match 1', status: 'open', author: { id: 'user1', email: 'user1@example.com', name: 'User One' }, datePlayed: '2025-12-17', scorecardId: 'sc1' },
  { _id: '2', name: 'Match 2', status: 'completed', author: { id: 'user2', email: 'user2@example.com', name: 'User Two' }, datePlayed: '2025-12-01' },
  { _id: '3', name: 'Match 3', status: 'open', author: { id: 'user1', email: 'user1@example.com', name: 'User One' }, datePlayed: '2025-12-18' },
  { _id: '4', name: 'Match 4', status: 'cancelled', author: { id: 'user3', email: 'user3@example.com', name: 'User Three' }, datePlayed: '2025-11-20', scorecardId: 'sc2' },
];

const getState = (extra: Partial<MatchState> = {}): MatchState => ({
  ids: mockMatches.map(m => m._id!),
  entities: mockMatches.reduce((acc, m) => ({ ...acc, [m._id!]: m }), {} as Record<string, Match>),
  loading: false,
  error: null,
  currentMatch: null,
  filterByUser: null,
  filterByStatus: null,
  deleteConflict: null,
  ...extra,
});

describe('match selectors', () => {
  it('should select all matches', () => {
    const state = getState();
    const result = fromSelectors.selectAllMatches.projector(state);
    expect(result.length).toBe(4);
  });

  it('should select match by id', () => {
    const selector = fromSelectors.selectMatchById('2');
    const result = selector.projector(getState().entities);
    expect(result).toEqual(mockMatches[1]);
  });

  it('should select matches by status', () => {
    const selector = fromSelectors.selectMatchesByStatus('open');
    const allMatches = fromSelectors.selectAllMatches.projector(getState());
    const result = selector.projector(allMatches);
    expect(result.length).toBe(2);
    expect(result[0].status).toBe('open');
  });

  it('should select open matches', () => {
    const allMatches = fromSelectors.selectAllMatches.projector(getState());
    const result = fromSelectors.selectOpenMatches.projector(allMatches);
    expect(result.every(m => m.status === 'open')).toBeTrue();
  });

  it('should select completed matches', () => {
    const allMatches = fromSelectors.selectAllMatches.projector(getState());
    const result = fromSelectors.selectCompletedMatches.projector(allMatches);
    expect(result.length).toBe(1);
    expect(result[0].status).toBe('completed');
  });

  it('should select matches with scorecard', () => {
    const allMatches = fromSelectors.selectAllMatches.projector(getState());
    const result = fromSelectors.selectMatchesWithScorecard.projector(allMatches);
    expect(result.length).toBe(2);
    expect(result[0].scorecardId).toBeDefined();
  });

  it('should select matches without scorecard', () => {
    const allMatches = fromSelectors.selectAllMatches.projector(getState());
    const result = fromSelectors.selectMatchesWithoutScorecard.projector(allMatches);
    expect(result.length).toBe(2);
    expect(result[0].scorecardId).toBeUndefined();
  });

  it('should select match stats', () => {
    const allMatches = fromSelectors.selectAllMatches.projector(getState());
    const result = fromSelectors.selectMatchStats.projector(allMatches);
    expect(result.total).toBe(4);
    expect(result.open).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.cancelled).toBe(1);
    expect(result.withScorecard).toBe(2);
    expect(result.withoutScorecard).toBe(2);
  });

  it('should select matches by name', () => {
    const selector = fromSelectors.selectMatchesByName('Match 1');
    const allMatches = fromSelectors.selectAllMatches.projector(getState());
    const result = selector.projector(allMatches);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Match 1');
  });
});
