import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { MemberListComponent } from './member-list';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('MemberListComponent', () => {
  let component: MemberListComponent;
  let fixture: ComponentFixture<MemberListComponent>;
  let memberServiceSpy: jasmine.SpyObj<MemberService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let confirmDialogSpy: jasmine.SpyObj<ConfirmDialogService>;
  let preferencesSpy: jasmine.SpyObj<UserPreferencesService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockMembers = [
    {
      _id: '1',
      firstName: 'Alice',
      lastName: 'Smith',
      Email: 'alice@example.com',
      usgaIndex: 10,
      fullName: 'Alice Smith',
      user: 'user1',
    },
    {
      _id: '2',
      firstName: 'Bob',
      lastName: 'Jones',
      Email: 'bob@example.com',
      usgaIndex: 20,
      fullName: 'Bob Jones',
      user: 'user2',
    },
  ];

  beforeEach(async () => {
    memberServiceSpy = jasmine.createSpyObj('MemberService', [
      'getAll',
      'delete',
      'removeDuplicateEmails',
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['hasRole', 'hasMinRole', 'getRoles', 'getUserName', 'getUserEmail'], { 
      role: 'admin'
    });
    authServiceSpy.hasRole.and.returnValue(true);
    authServiceSpy.hasMinRole.and.returnValue(true);
    authServiceSpy.getRoles.and.returnValue(['admin']);
    authServiceSpy.getUserName.and.returnValue('Test User');
    authServiceSpy.getUserEmail.and.returnValue('test@example.com');
    confirmDialogSpy = jasmine.createSpyObj('ConfirmDialogService', [
      'confirmDelete',
      'confirmAction',
    ]);
    preferencesSpy = jasmine.createSpyObj('UserPreferencesService', [
      'getMemberListColumnPreferences',
      'saveMemberListColumnPreferences',
      'clearUserPreferences',
    ]);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    preferencesSpy.getMemberListColumnPreferences.and.returnValue([]);
    memberServiceSpy.getAll.and.returnValue(of(mockMembers));
    confirmDialogSpy.confirmDelete.and.returnValue(of(true));
    confirmDialogSpy.confirmAction.and.returnValue(of(true));
    memberServiceSpy.delete.and.returnValue(of({}));
    memberServiceSpy.removeDuplicateEmails.and.returnValue(of({ deletedCount: 1 }));

    await TestBed.configureTestingModule({
      imports: [MemberListComponent],
      providers: [
        { provide: MemberService, useValue: memberServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ConfirmDialogService, useValue: confirmDialogSpy },
        { provide: UserPreferencesService, useValue: preferencesSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: Router, useValue: routerSpy },
      ],
    })
      .overrideComponent(MemberListComponent, {
        set: {
          providers: [{ provide: MatSnackBar, useValue: snackBarSpy }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load members on init', () => {
    expect(memberServiceSpy.getAll).toHaveBeenCalled();
    expect(component.members.length).toBe(2);
    expect(component.filteredMembers.length).toBe(2);
    expect(component.loading).toBeFalse();
  });

  it('should filter members by search term', () => {
    component.searchTerm = 'alice';
    component.applyFilter();
    expect(component.filteredMembers.length).toBe(1);
    expect(component.filteredMembers[0].firstName).toBe('Alice');
  });

  it('should sort members by usgaIndex desc', () => {
    component.sortField = 'usgaIndex';
    component.sortDirection = 'desc';
    component.applyFilter();
    expect(component.filteredMembers[0].usgaIndex).toBe(20);
  });

  it('should show snackbar if member loading fails', fakeAsync(() => {
    // Arrange: make service fail
    memberServiceSpy.getAll.and.returnValue(throwError(() => new Error('fail')));
    snackBarSpy.open.calls.reset();

    // Act: call loadMembers and flush microtasks
    component.loadMembers();
    tick();
    fixture.detectChanges();

    // Assert: snackbar called with expected message and loading cleared
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error loading members', 'Close', {
      duration: 2000,
    });
    expect(component.loading).toBeFalse();
  }));

  it('should navigate to edit member if admin', () => {
    component.editMember('1');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/members/edit', '1']);
  });
// TODO test all authorization paths
  it('should show snackbar if non-admin tries to edit member', () => {
    authServiceSpy.hasMinRole.and.returnValue(false);
    snackBarSpy.open.calls.reset();
    component.editMember('1');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'You are not authorized to edit members.',
      'Close',
      { duration: 2500 }
    );
  });

  it('should confirm and delete member if admin', fakeAsync(() => {
    component.deleteMember('1');
    tick();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(confirmDialogSpy.confirmDelete).toHaveBeenCalled();
    expect(memberServiceSpy.delete).toHaveBeenCalledWith('1');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Member deleted', 'Close', { duration: 2000 });
  }));

  it('should show snackbar if delete fails', fakeAsync(() => {
    memberServiceSpy.delete.and.returnValue(throwError(() => ({ status: 500 })));
    component.deleteMember('1');
    tick();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error deleting member', 'Close', {
      duration: 2000,
    });
  }));

  it('should show snackbar if unauthorized to delete', () => {
    memberServiceSpy.delete.and.returnValue(throwError(() => ({ status: 403 })));
    component.deleteMember('1');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'You are not authorized to delete members.',
      'Close',
      { duration: 2500 }
    );
  });

  it('should prevent hiding all data columns', () => {
    component.allColumns = [
      { key: 'fullName', label: 'Name', visible: true, fixed: false },
      { key: 'Email', label: 'Email', visible: false, fixed: false },
    ];
    component.toggleColumnVisibility('fullName');
    fixture.detectChanges();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'At least one data column must remain visible',
      'Close',
      { duration: 2000 }
    );
  });

  it('should reset columns to default', () => {
    component.allColumns.forEach((col) => (col.visible = false));
    component.resetColumns();
    expect(component.allColumns.every((col) => col.visible)).toBeTrue();
  });

  it('should clear all preferences after confirmation', () => {
    confirmDialogSpy.confirmAction.and.returnValue(of(true));
    component.clearAllPreferences();
    expect(preferencesSpy.clearUserPreferences).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'All preferences have been reset to defaults',
      'Close',
      { duration: 3000 }
    );
  });

  it('should confirm and remove duplicate emails if admin', () => {
    component.removeDuplicateEmails();
    expect(confirmDialogSpy.confirmAction).toHaveBeenCalled();
    expect(memberServiceSpy.removeDuplicateEmails).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Removed 1 duplicate members', 'Close', {
      duration: 4000,
    });
  });

  it('should show snackbar if no duplicates found', () => {
    memberServiceSpy.removeDuplicateEmails.and.returnValue(of({ deletedCount: 0 }));
    component.removeDuplicateEmails();
    expect(snackBarSpy.open).toHaveBeenCalledWith('No duplicate email addresses found', 'Close', {
      duration: 3000,
    });
  });

  it('should show snackbar if unauthorized to remove duplicates', fakeAsync(() => {
    memberServiceSpy.removeDuplicateEmails.and.returnValue(throwError(() => ({ status: 403 })));
    component.removeDuplicateEmails();
    tick();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'You are not authorized to remove duplicates.',
      'Close',
      { duration: 2500 }
    );
  }));

  it('should not call delete if member id is missing', () => {
    component.deleteMember('');
    expect(memberServiceSpy.delete).not.toHaveBeenCalled();
  });

  it('should handle empty member list gracefully', () => {
    memberServiceSpy.getAll.and.returnValue(of([]));
    component.loadMembers();
    fixture.detectChanges();
    expect(component.members.length).toBe(0);
    expect(component.filteredMembers.length).toBe(0);
  });
});
