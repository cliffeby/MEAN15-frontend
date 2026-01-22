import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrphanService, OrphanReport, CleanupResult } from '../services/orphanService';
import { AuthService } from '../services/authService';
import { environment } from '../../environments/environment';

const baseUrl = `${environment.apiUrl}/orphans`;
const mockToken = 'mock-jwt-token';

const mockReport: OrphanReport = {
  summary: {
    totalOrphans: 3,
    matchOrphans: 1,
    memberOrphans: 1,
    scorecardOrphans: 0,
    userOrphans: 1,
    intentionalOrphans: 0
  },
  details: {
    matchOrphans: [{ id: 'm1' }],
    memberOrphans: [{ id: 'u2' }],
    scorecardOrphans: [],
    userOrphans: [{ id: 'usr1' }],
    intentionalOrphans: []
  },
  recommendations: [
    { type: 'delete', message: 'Remove orphaned matches', severity: 'medium' }
  ]
};

const mockCleanup: CleanupResult = {
  cleaned: 3,
  deleted: 2,
  nullified: 1,
  errors: []
};

describe('OrphanService', () => {
  let service: OrphanService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['token']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrphanService, { provide: AuthService, useValue: authSpy }]
    });

    service = TestBed.inject(OrphanService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => httpMock.verify());

  describe('getOrphanReport', () => {
    it('returns report with auth header', () => {
      authService.token.and.returnValue(mockToken);

      service.getOrphanReport().subscribe((res) => {
        expect(res.report).toEqual(mockReport);
      });

      const req = httpMock.expectOne(`${baseUrl}/report`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, report: mockReport });
    });

    it('handles server error', () => {
      authService.token.and.returnValue(null);

      service.getOrphanReport().subscribe({
        next: () => fail('should have errored'),
        error: (err: any) => expect(err.message).toContain('Server error')
      });

      const req = httpMock.expectOne(`${baseUrl}/report`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('findOrphans', () => {
    it('finds orphans and sends auth header when present', () => {
      authService.token.and.returnValue(mockToken);

      const mockFind = { orphans: [{ type: 'member', id: 'u1' }] };

      service.findOrphans().subscribe((res) => {
        expect(res.orphans).toBeDefined();
        expect(res.orphans.length).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/find`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockFind);
    });

    it('works without auth header when token missing', () => {
      authService.token.and.returnValue(null);

      const mockFind = { orphans: [] };
      service.findOrphans().subscribe((res) => {
        expect(res.orphans).toEqual([]);
      });

      const req = httpMock.expectOne(`${baseUrl}/find`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush(mockFind);
    });
  });

  // Removed empty describe('cleanupOrphans') block
});
