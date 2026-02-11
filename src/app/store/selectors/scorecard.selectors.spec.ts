import * as fromSelectors from './scorecard.selectors';
import { ScorecardState } from '../reducers/scorecard.reducer';
import { Scorecard } from '../../models/scorecard.interface';

const mockScorecards: Scorecard[] = [
  { _id: '1',  course: 'A',tees: 'Blue',teeAbreviation: 'B', rating: 72, slope: 120, par: 72, author: { id: 'user1', email: 'user1@example.com', name: 'User One' }, courseTeeName: 'Blue' },
  { _id: '2', course: 'B', tees: 'White', teeAbreviation: 'W', rating: 70, slope: 118, par: 70, author: { id: 'user2', email: 'user2@example.com', name: 'User Two' }, courseTeeName: 'White' },
  { _id: '3', course: 'A', tees: 'Red', teeAbreviation: 'R', author: { id: 'user1', email: 'user1@example.com', name: 'User One' }, courseTeeName: 'Red' },
];

const getState = (extra: Partial<ScorecardState> = {}): ScorecardState => ({
  ids: mockScorecards.map(s => s._id!),
  entities: mockScorecards.reduce((acc, s) => ({ ...acc, [s._id!]: s }), {} as Record<string, Scorecard>),
  loading: false,
  error: null,
  currentScorecard: null,
  ...extra,
});

describe('scorecard selectors', () => {
  it('should select all scorecards', () => {
    const state = getState();
    const result = fromSelectors.selectAllScorecards.projector(state);
    expect(result.length).toBe(3);
  });

  it('should select scorecard by id', () => {
    const selector = fromSelectors.selectScorecardById('2');
    const result = selector.projector(getState().entities);
    expect(result).toEqual(mockScorecards[1]);
  });

  it('should select scorecards for dropdown', () => {
    const allScorecards = fromSelectors.selectAllScorecards.projector(getState());
    const result = fromSelectors.selectScorecardsForDropdown.projector(allScorecards);
    expect(result[0].value).toBe('1');
    expect(result[0].label).toContain('Card 1');
  });

  it('should select scorecards with details', () => {
    const allScorecards = fromSelectors.selectAllScorecards.projector(getState());
    const result = fromSelectors.selectScorecardsWithDetails.projector(allScorecards);
    expect(result[0].displayName).toBe('Card 1');
    expect(result[0].fullDetails).toContain('Par: 72');
  });

  it('should select scorecards with rating', () => {
    const allScorecards = fromSelectors.selectAllScorecards.projector(getState());
    const result = fromSelectors.selectScorecardsWithRating.projector(allScorecards);
    expect(result.length).toBe(2);
  });

  it('should select scorecards with slope', () => {
    const allScorecards = fromSelectors.selectAllScorecards.projector(getState());
    const result = fromSelectors.selectScorecardsWithSlope.projector(allScorecards);
    expect(result.length).toBe(2);
  });

  it('should select scorecards by search', () => {
    const selector = fromSelectors.selectScorecardsSearch('Card 1');
    const allScorecards = fromSelectors.selectAllScorecards.projector(getState());
    const result = selector.projector(allScorecards);
    expect(result.length).toBe(1);
    expect(result[0].teeAbreviation).toBe('B');
  });

  it('should select scorecard stats', () => {
    const allScorecards = fromSelectors.selectAllScorecards.projector(getState());
    const result = fromSelectors.selectScorecardStats.projector(allScorecards);
    expect(result.total).toBe(3);
    expect(result.withRating).toBe(2);
    expect(result.withSlope).toBe(2);
    expect(result.averageRating).toBeGreaterThan(0);
    expect(result.averageSlope).toBeGreaterThan(0);
    expect(result.averagePar).toBeGreaterThan(0);
  });

  it('should select scorecard list data', () => {
    const allScorecards = fromSelectors.selectAllScorecards.projector(getState());
    const result = fromSelectors.selectScorecardListData.projector(allScorecards, false, null);
    expect(result.scorecards.length).toBe(3);
    expect(result.isEmpty).toBeFalse();
  });

  it('should select scorecard form data', () => {
    const result = fromSelectors.selectScorecardFormData.projector(mockScorecards[0], false, null);
    expect(result.scorecard).toEqual(mockScorecards[0]);
    expect(result.isEditing).toBeTrue();
  });
});
