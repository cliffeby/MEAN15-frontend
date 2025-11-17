import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberListComponent } from './member-list';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { of } from 'rxjs';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

describe('MemberListComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });
  let component: MemberListComponent;
  let fixture: ComponentFixture<MemberListComponent>;
  let memberServiceSpy: jasmine.SpyObj<MemberService>;
  let confirmDialogSpy: jasmine.SpyObj<ConfirmDialogService>;
  let authServiceMock: any;

  beforeEach(async () => {
    memberServiceSpy = jasmine.createSpyObj('MemberService', ['getAll', 'delete']);
  confirmDialogSpy = jasmine.createSpyObj('ConfirmDialogService', ['confirmDelete']);
  confirmDialogSpy.confirmDelete.and.returnValue(of(true));
  authServiceMock = { role: 'admin' };
  memberServiceSpy.getAll.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [
        MemberListComponent,
      ],
      providers: [
        { provide: MemberService, useValue: memberServiceSpy },
        { provide: ConfirmDialogService, useValue: confirmDialogSpy },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(MemberListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load members on init', () => {
    const mockMembers = [{
      _id: '1',
      firstName: 'Test',
      lastName: 'User',
      user: 'user1',
      email: 'test@example.com',
      usgaIndex: 10,
      lastDatePlayed: '2025-11-15',
      scorecardsId: [],
      fullName: 'Test User',
      fullNameR: 'User, Test'
    }];
    memberServiceSpy.getAll.and.returnValue(of(mockMembers));
    component.ngOnInit();
    expect(component.members).toEqual(mockMembers);
  });

  it('should delete a member', () => {
    memberServiceSpy.delete.and.returnValue(of({ success: true }));
    confirmDialogSpy.confirmDelete.and.returnValue(of(true));
    component.members = [{
      _id: '1',
      firstName: 'Test',
      lastName: 'User',
      user: 'user1',
      email: 'test@example.com',
      usgaIndex: 10,
      lastDatePlayed: '2025-11-15',
      scorecardsId: [],
      fullName: 'Test User',
      fullNameR: 'User, Test'
    }];
    component.deleteMember('1');
    expect(memberServiceSpy.delete).toHaveBeenCalledWith('1');
  });
});
