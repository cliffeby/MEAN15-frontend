import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScoreService } from '../services/scoreService';
import { AuthService } from '../services/authService';
import { Score } from '../models/score';
import { environment } from '../../environments/environment';

const baseUrl = `${environment.apiUrl}/scores`;
const mockToken = 'mock-jwt-token';
const authSpy = jasmine.createSpyObj('AuthService', ['token', 'getAuthorName']);

const mockScores: Score[] = [
  {
    _id: 's1',
    name: 'Score 1',
    score: 72,
    scoreRecordType: 'byHole',
    scoresToPost: [],
    postedScore: 70,
    scores: [],
    handicap: 10,
    usgaIndex: 12.5,
    scoringMethod: 'byHole',
    author: { id: 'test-id', email: 'test@example.com', name: 'Test User' },
  },
  {
    _id: 's2',
    name: 'Score 2',
    score: 66,
    scoreRecordType: 'byHole',
    scoresToPost: [],
    postedScore: 70,
    scores: [],
    handicap: 10,
    usgaIndex: 12.5,
    scoringMethod: 'byHole',
    author: { id: 'test-id', email: 'test@example.com', name: 'Test User' },
  },
];

describe('ScoreService', () => {
  let service: ScoreService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['token', 'getAuthorName', 'getAuthorObject']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScoreService, { provide: AuthService, useValue: authSpy }],
    });

    service = TestBed.inject(ScoreService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authService.getAuthorObject.and.returnValue({ id: 'test-id', email: 'test@example.com', name: 'Test User' });
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('fetches all scores and caches results', () => {
      authService.token.and.returnValue(mockToken);

      // First call: should make HTTP request
      service.getAll().subscribe((res) => {
        // Accept both array and object with scores property
        if (Array.isArray(res)) {
          expect(res).toEqual(mockScores);
        } else if (res && Array.isArray(res.scores)) {
          expect(res.scores).toEqual(mockScores);
        } else {
          fail('Unexpected response shape');
        }
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, count: 2, scores: mockScores });

      // Second call: should use cache (no new request)
      service.getAll().subscribe((res) => {
        if (Array.isArray(res)) {
          expect(res).toEqual(mockScores);
        } else if (res && Array.isArray(res.scores)) {
          expect(res.scores).toEqual(mockScores);
        } else {
          fail('Unexpected response shape');
        }
      });
      httpMock.expectNone(baseUrl);
    });

    it('handles error from getAll', () => {
      authService.token.and.returnValue(null);

      service.getAll().subscribe({
        next: () => fail('should have failed'),
        error: (err) => expect(err.message).toContain('Server error'),
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('create', () => {
    it('creates a score and clears cache', () => {
      authService.token.and.returnValue(mockToken);
      const newScore: Partial<Score> = {
        author: { id: 'u3', email: 'u3@email.com', name: 'u3' },
        score: 70,
      };

      // populate cache
      service.getAll().subscribe();
      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, count: 2, scores: mockScores });

      service.create(newScore as Score).subscribe((res) => {
        expect(res.score._id).toBe('s3');
      });

      const req2 = httpMock.expectOne(baseUrl);
      expect(req2.request.method).toBe('POST');
      expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req2.flush({ success: true, score: { ...newScore, _id: 's3' } });

      // cache cleared, next getAll should make a request
      service.getAll().subscribe();
      const req3 = httpMock.expectOne(baseUrl);
      req3.flush({
        success: true,
        count: 3,
        scores: [...mockScores, { _id: 's3', author: { name: 'u3' }, total: 70 }],
      });
    });

    it('retries on failure and surfaces 409 conflict', () => {
      authService.token.and.returnValue(mockToken);
      const dup: Partial<Score> = {
        author: { id: 'u1', email: 'u1@email.com', name: 'u1' },
        score: 72,
      };

      service.create(dup as Score).subscribe({
        next: () => fail('should have failed with 409'),
        error: (err) => expect(err.message).toContain('Server error'),
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });
  });

  describe('getById', () => {
    it('fetches score by id', () => {
      authService.token.and.returnValue(mockToken);

      service.getById('s1').subscribe((res) => {
        expect(res.score).toEqual(mockScores[0]);
      });

      const req = httpMock.expectOne(`${baseUrl}/s1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, score: mockScores[0] });
    });

    it('handles 404 for getById', () => {
      authService.token.and.returnValue(null);

      service.getById('nope').subscribe({
        next: () => fail('should have failed with 404'),
        error: (err) => expect(err.message).toContain('Server error'),
      });

      const req = httpMock.expectOne(`${baseUrl}/nope`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('update', () => {
    it('updates a score and clears cache', () => {
      authService.token.and.returnValue(mockToken);
      const updated = { ...mockScores[0], total: 74 } as Score;

      // populate cache
      service.getAll().subscribe();
      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, count: 2, scores: mockScores });

      service.update('s1', updated).subscribe((res) => {
        expect(res.score).toEqual(updated);
      });

      const req2 = httpMock.expectOne(`${baseUrl}/s1`);
      expect(req2.request.method).toBe('PUT');
      expect(req2.request.body).toEqual(updated);
      req2.flush({ success: true, score: updated });

      // cache should be cleared
      service.getAll().subscribe();
      const req3 = httpMock.expectOne(baseUrl);
      req3.flush({ success: true, count: 2, scores: [updated, mockScores[1]] });
    });

    it('handles error on update', () => {
      authService.token.and.returnValue(mockToken);
      const updated = { ...mockScores[0], total: 999 } as Score;

      service.update('s1', updated).subscribe({
        next: () => fail('should have failed with 400'),
        error: (err) => expect(err.message).toContain('Server error'),
      });

      const req = httpMock.expectOne(`${baseUrl}/s1`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('delete', () => {
    it('deletes a score and clears cache', () => {
      authService.token.and.returnValue(mockToken);
      authService.getAuthorName.and.returnValue('Test User');
      // populate cache
      service.getAll().subscribe();
      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, count: 2, scores: mockScores });

      // Only name param is sent in this test, so expect only name in query
      service.delete({ id: 's1', name: 'a1' }).subscribe((res) => {
        expect(res.success).toBeTruthy();
      });

      const req2 = httpMock.expectOne(`${baseUrl}/s1?name=a1`);
      expect(req2.request.method).toBe('DELETE');
      req2.flush({ success: true });

      // cache cleared
      service.getAll().subscribe();
      const req3 = httpMock.expectOne(baseUrl);
      req3.flush({ success: true, count: 1, scores: [mockScores[1]] });
    });

    it('handles error on delete', () => {
      authService.token.and.returnValue(mockToken);

      service.delete({ id: 's1', name: 'a1' }).subscribe({
        next: () => fail('should have failed with 500'),
        error: (err) => expect(err.message).toContain('Server error'),
      });

      const req = httpMock.expectOne(`${baseUrl}/s1?name=a1`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('special queries', () => {
    it('fetches scores by member', () => {
      authService.token.and.returnValue(mockToken);

      service.getScoresByMember('m1').subscribe((res) => {
        expect(res.scores).toEqual(mockScores);
      });

      const req = httpMock.expectOne(`${baseUrl}/member/m1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, count: 2, scores: mockScores });
    });

    it('fetches scores by match', () => {
      authService.token.and.returnValue(mockToken);

      service.getScoresByMatch('match1').subscribe((res) => {
        expect(res.scores).toEqual(mockScores);
      });

      const req = httpMock.expectOne(`${baseUrl}/match/match1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, count: 2, scores: mockScores });
    });

    it('fetches scores by scorecard', () => {
      authService.token.and.returnValue(mockToken);

      service
        .getScoresByScorecard('sc1')
        .subscribe((res) => expect(res.scores).toEqual(mockScores));

      const req = httpMock.expectOne(`${baseUrl}/scorecard/sc1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, count: 2, scores: mockScores });
    });
  });

  describe('savePlayerScore', () => {
    it('creates a new score when existingScoreId is not provided', async () => {
      authService.token.and.returnValue(mockToken);
      const newScore: Partial<Score> = {
        author: { id: 'u3', email: 'u3@email.com', name: 'u3' },
        score: 71,
      };

      const promise = service.savePlayerScore(newScore);

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, score: { ...newScore, _id: 's3' } });

      const result = await promise;
      expect(result.score._id).toBe('s3');
    });

    it('updates an existing score when existingScoreId is provided', async () => {
      authService.token.and.returnValue(mockToken);
      const updated: Partial<Score> = { score: 69 };

      const promise = service.savePlayerScore(updated, 's1');

      const req = httpMock.expectOne(`${baseUrl}/s1`);
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true, score: { ...mockScores[0], ...updated } });

      const res = await promise;
      expect(res.score.score).toBe(69);
    });
  });
});
