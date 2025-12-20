import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MemberService } from '../services/memberService';
import { Member } from '../models/member';
import { AuthService } from '../services/authService';
import { environment } from '../../environments/environment';

const mockMembers: Member[] = [
  {
    _id: '1',
    firstName: 'John',
    lastName: 'Doe',
    Email: 'john@example.com',
    author: { id: 'cce', email: 'cce@example.com', name: 'CCE' },
    usgaIndex: 10,
    hidden: false,
  },
  {
    _id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    Email: 'jane@example.com',
    author: { id: 'cce', email: 'cce@example.com', name: 'CCE' },
    usgaIndex: 12,
    hidden: false,
  },
];

const mockToken = 'mock-jwt-token';
const baseUrl = `${environment.apiUrl}/members`;

describe('MemberService', () => {
  let service: MemberService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['token']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MemberService, { provide: AuthService, useValue: authServiceSpy }],
    });
    service = TestBed.inject(MemberService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAll', () => {
    it('should fetch all members with authentication', () => {
      authService.token.and.returnValue(mockToken);

      service.getAll().subscribe((members) => {
        expect(members.length).toBe(2);
        expect(members).toEqual(mockMembers);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, count: 2, members: mockMembers });
    });

    it('should fetch all members without authentication', () => {
      authService.token.and.returnValue(null);

      service.getAll().subscribe((members) => {
        expect(members).toEqual(mockMembers);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true, count: 2, members: mockMembers });
    });

    it('should use cache for subsequent requests within cache duration', () => {
      authService.token.and.returnValue(mockToken);

      // First request
      service.getAll().subscribe((members) => {
        expect(members).toEqual(mockMembers);
      });

      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, count: 2, members: mockMembers });

      // Second request should use cache (no HTTP call)
      service.getAll().subscribe((members) => {
        expect(members).toEqual(mockMembers);
      });

      // Verify no additional HTTP requests
      httpMock.expectNone(baseUrl);
    });

    it('should handle error when fetching members', () => {
      authService.token.and.returnValue(mockToken);

      service.getAll().subscribe({
        next: () => fail('should have failed with 500 error'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('create', () => {
    it('should create a new member with authentication', () => {
      authService.token.and.returnValue(mockToken);
      const newMember: Member = {
        _id: '3',
        firstName: 'Alice',
        lastName: 'Brown',
        Email: 'alice@example.com',
        author: { id: 'cce', email: 'cce@example.com', name: 'CCE' },
        usgaIndex: 15,
        hidden: false,
      };

      service.create(newMember).subscribe((member) => {
        expect(member).toEqual(newMember);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      expect(req.request.body).toEqual(newMember);
      req.flush({ success: true, member: newMember });
    });

    it('should handle 409 conflict error when creating duplicate member', () => {
      authService.token.and.returnValue(mockToken);
      const duplicateMember: Member = {
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        Email: 'john@example.com',
        author: { id: 'cce', email: 'cce@example.com', name: 'CCE' },
        usgaIndex: 10,
        hidden: false,
      };

      service.create(duplicateMember).subscribe({
        next: () => fail('should have failed with 409 error'),
        error: (error) => {
          expect(error.status).toBe(409);
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Duplicate email', { status: 409, statusText: 'Conflict' });
    });

    it('should clear cache after creating a member', () => {
      authService.token.and.returnValue(mockToken);
      const newMember: Member = {
        _id: '3',
        firstName: 'Alice',
        lastName: 'Brown',
        Email: 'alice@example.com',
        author: { id: 'cce', email: 'cce@example.com', name: 'CCE' },
        usgaIndex: 15,
        hidden: false,
      };

      // First, populate cache
      service.getAll().subscribe();
      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, count: 2, members: mockMembers });

      // Create member (should clear cache)
      service.create(newMember).subscribe();
      const req2 = httpMock.expectOne(baseUrl);
      req2.flush({ success: true, member: newMember });

      // Next getAll should make a new HTTP request (cache cleared)
      service.getAll().subscribe();
      const req3 = httpMock.expectOne(baseUrl);
      expect(req3).toBeTruthy();
      req3.flush({ success: true, count: 3, members: [...mockMembers, newMember] });
    });
  });

  describe('getById', () => {
    it('should fetch a member by id with authentication', () => {
      authService.token.and.returnValue(mockToken);

      service.getById('1').subscribe((member) => {
        expect(member).toEqual(mockMembers[0]);
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, member: mockMembers[0] });
    });
  });
});
