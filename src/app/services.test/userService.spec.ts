import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { User } from '../models/users';
import { environment } from '../../environments/environment';

const baseUrl = `${environment.apiUrl}/users`;

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  const mockUsers: User[] = [
    { 
      _id: '1', 
      name: 'user1', 
      email: 'user1@example.com', 
      role: 'user',
      defaultLeague: 'league1'
    },
    { 
      _id: '2', 
      name: 'user2', 
      email: 'user2@example.com', 
      role: 'admin',
      defaultLeague: 'league2'
    },
  ];

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['token']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        { provide: AuthService, useValue: authServiceSpy }
      ],
    });
    
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAll', () => {
    it('should fetch all users with authentication token', () => {
      authService.token.and.returnValue(mockToken);

      service.getAll().subscribe((response) => {
        expect(response).toBeTruthy();
        expect(response.users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, users: mockUsers });
    });

    it('should fetch all users without authentication token', () => {
      authService.token.and.returnValue(null);

      service.getAll().subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true, users: mockUsers });
    });

    it('should handle error when fetching users', () => {
      authService.token.and.returnValue(mockToken);

      service.getAll().subscribe(
        () => fail('should have failed with 500 error'),
        (error) => {
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne(baseUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getById', () => {
    it('should fetch a user by id with authentication', () => {
      authService.token.and.returnValue(mockToken);

      service.getById('1').subscribe((response) => {
        expect(response.user).toEqual(mockUsers[0]);
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, user: mockUsers[0] });
    });

    it('should fetch a user by id without authentication', () => {
      authService.token.and.returnValue(null);

      service.getById('2').subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${baseUrl}/2`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true, user: mockUsers[1] });
    });

    it('should handle 404 error when user not found', () => {
      authService.token.and.returnValue(mockToken);

      service.getById('999').subscribe(
        () => fail('should have failed with 404 error'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${baseUrl}/999`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('delete', () => {
    it('should delete a user with authentication', () => {
      authService.token.and.returnValue(mockToken);

      service.delete('1').subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, message: 'User deleted' });
    });

    it('should handle 403 error when unauthorized to delete', () => {
      authService.token.and.returnValue(mockToken);

      service.delete('1').subscribe(
        () => fail('should have failed with 403 error'),
        (error) => {
          expect(error.status).toBe(403);
        }
      );

      const req = httpMock.expectOne(`${baseUrl}/1`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle missing authentication token', () => {
      authService.token.and.returnValue(null);

      service.delete('1').subscribe(
        () => fail('should have failed with 401 error'),
        (error) => {
          expect(error.status).toBe(401);
        }
      );

      const req = httpMock.expectOne(`${baseUrl}/1`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('updateLeague', () => {
    it('should update user default league with authentication', () => {
      authService.token.and.returnValue(mockToken);
      const newLeague = 'new-league';

      service.updateLeague('1', newLeague).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.user.defaultLeague).toBe(newLeague);
      });

      const req = httpMock.expectOne(`${baseUrl}/1/league`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      expect(req.request.body).toEqual({ defaultLeague: newLeague });
      req.flush({ 
        success: true, 
        user: { ...mockUsers[0], defaultLeague: newLeague } 
      });
    });

    it('should handle error when updating league', () => {
      authService.token.and.returnValue(mockToken);

      service.updateLeague('1', 'invalid-league').subscribe(
        () => fail('should have failed with 400 error'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(`${baseUrl}/1/league`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should update league without authentication token', () => {
      authService.token.and.returnValue(null);
      const newLeague = 'test-league';

      service.updateLeague('2', newLeague).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${baseUrl}/2/league`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.headers.has('Authorization')).toBe(false);
      expect(req.request.body).toEqual({ defaultLeague: newLeague });
      req.flush({ success: true, user: { ...mockUsers[1], defaultLeague: newLeague } });
    });

    it('should handle server error when updating league', () => {
      authService.token.and.returnValue(mockToken);

      service.updateLeague('1', 'some-league').subscribe(
        () => fail('should have failed with 500 error'),
        (error) => {
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne(`${baseUrl}/1/league`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Authorization Headers', () => {
    it('should include Authorization header when token exists', () => {
      authService.token.and.returnValue(mockToken);

      service.getAll().subscribe();

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({ success: true, users: [] });
    });

    it('should not include Authorization header when token is null', () => {
      authService.token.and.returnValue(null);

      service.getAll().subscribe();

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true, users: [] });
    });

    it('should not include Authorization header when token is undefined', () => {
      authService.token.and.returnValue(undefined as any);

      service.getAll().subscribe();

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true, users: [] });
    });
  });
});
