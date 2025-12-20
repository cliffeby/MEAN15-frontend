import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScorecardService } from '../services/scorecardService';
import { Scorecard } from '../models/scorecard.interface';
import { AuthService } from '../services/authService';
import { environment } from '../../environments/environment';

const mockScorecards: Scorecard[] = [
  { _id: 'sc1', name: 'Front Nine', par: 36, author: { id: 'u1', email: 'u1@example.com', name: 'User One' } },
  { _id: 'sc2', name: 'Back Nine', par: 36, author: { id: 'u2', email: 'u2@example.com', name: 'User Two' }  },
];

const mockToken = 'mock-jwt-token';
const baseUrl = `${environment.apiUrl}/scorecards`;

describe('ScorecardService', () => {
  let service: ScorecardService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['token']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ScorecardService,
        { provide: AuthService, useValue: authServiceSpy }
      ],
    });

    service = TestBed.inject(ScorecardService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAll', () => {
    it('should fetch all scorecards with auth header when token present', () => {
      authService.token.and.returnValue(mockToken);

      service.getAll().subscribe((res) => {
        expect(res.scorecards).toEqual(mockScorecards);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, scorecards: mockScorecards });
    });

    it('should fetch all scorecards without auth header when token absent', () => {
      authService.token.and.returnValue(null);

      service.getAll().subscribe((res) => {
        expect(res.scorecards).toEqual(mockScorecards);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true, scorecards: mockScorecards });
    });

    it('should handle server error on getAll', () => {
      authService.token.and.returnValue(mockToken);

      service.getAll().subscribe({
        next: () => fail('should have failed with 500'),
        error: (err) => expect(err.message).toContain('Server error')
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('create', () => {
    it('should create a scorecard with auth header', () => {
      authService.token.and.returnValue(mockToken);
      const newScorecard: Scorecard = { name: 'Full Course', par: 72, author: { id: 'u3', email: 'u3@example.com', name: 'User Three' } };

      service.create(newScorecard).subscribe((res) => {
        expect(res.scorecard).toEqual({ ...newScorecard, _id: 'sc3' });
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      expect(req.request.body).toEqual(newScorecard);
      req.flush({ success: true, scorecard: { ...newScorecard, _id: 'sc3' } });
    });

    it('should handle 409 conflict on create', () => {
      authService.token.and.returnValue(mockToken);
      const dup: Scorecard = { name: 'Front Nine', author: { id: 'u1', email: 'u1@example.com', name: 'User One' } };

      service.create(dup).subscribe({
        next: () => fail('should have failed with 409'),
        error: (err) => expect(err.message).toContain('Server error')
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });
  });

  describe('getById', () => {
    it('should fetch scorecard by id with auth header', () => {
      authService.token.and.returnValue(mockToken);

      service.getById('sc1').subscribe((res) => {
        expect(res.scorecard).toEqual(mockScorecards[0]);
      });

      const req = httpMock.expectOne(`${baseUrl}/sc1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, scorecard: mockScorecards[0] });
    });

    it('should handle 404 when scorecard not found', () => {
      authService.token.and.returnValue(null);

      service.getById('not-exist').subscribe({
        next: () => fail('should have failed with 404'),
        error: (err) => expect(err.message).toContain('Server error')
      });

      const req = httpMock.expectOne(`${baseUrl}/not-exist`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('update', () => {
    it('should update scorecard and send auth header', () => {
      authService.token.and.returnValue(mockToken);
      const updated: Scorecard = { ...mockScorecards[0], name: 'Front 9 Updated' };

      service.update('sc1', updated).subscribe((res) => {
        expect(res.scorecard).toEqual(updated);
      });

      const req = httpMock.expectOne(`${baseUrl}/sc1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      expect(req.request.body).toEqual(updated);
      req.flush({ success: true, scorecard: updated });
    });

    it('should handle error on update', () => {
      authService.token.and.returnValue(mockToken);
      const updated: Scorecard = { ...mockScorecards[0], name: 'Bad Update' };

      service.update('sc1', updated).subscribe({
        next: () => fail('should have failed with 400'),
        error: (err) => expect(err.message).toContain('Server error')
      });

      const req = httpMock.expectOne(`${baseUrl}/sc1`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('delete', () => {
    it('should delete scorecard with auth header', () => {
      authService.token.and.returnValue(mockToken);

      service.delete('sc1').subscribe((res) => {
        expect(res.success).toBeTruthy();
      });

      const req = httpMock.expectOne(`${baseUrl}/sc1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true });
    });

    it('should handle server error on delete', () => {
      authService.token.and.returnValue(mockToken);

      service.delete('sc1').subscribe({
        next: () => fail('should have failed with 500'),
        error: (err) => expect(err.message).toContain('Server error')
      });

      const req = httpMock.expectOne(`${baseUrl}/sc1`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
