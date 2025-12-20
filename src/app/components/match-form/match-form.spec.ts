import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchFormComponent } from './match-form';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { ScorecardService } from '../../services/scorecardService';

describe('MatchFormComponent', () => {
  let component: MatchFormComponent;
  let fixture: ComponentFixture<MatchFormComponent>;
  let storeSpy: jasmine.SpyObj<Store<any>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let memberServiceSpy: jasmine.SpyObj<MemberService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let scorecardServiceSpy: jasmine.SpyObj<ScorecardService>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    memberServiceSpy = jasmine.createSpyObj('MemberService', ['getAll']);
    authServiceSpy = jasmine.createSpyObj('AuthService', [], { user: { email: 'test@example.com', name: 'Test User', id: 'u1' } });
    authServiceSpy.getAuthorObject = jasmine.createSpy('getAuthorObject').and.returnValue({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User'
    });
    scorecardServiceSpy = jasmine.createSpyObj('ScorecardService', ['getAll']);

    storeSpy.select.and.returnValue(of([]));
    memberServiceSpy.getAll.and.returnValue(of([]));
    scorecardServiceSpy.getAll.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [MatchFormComponent, ReactiveFormsModule],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MemberService, useValue: memberServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ScorecardService, useValue: scorecardServiceSpy },
        FormBuilder
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    storeSpy.dispatch.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.matchForm).toBeDefined();
    expect(component.matchForm.get('name')).toBeDefined();
    expect(component.matchForm.get('status')?.value).toBe('open');
  });

  it('should not submit if form is invalid', () => {
    component.matchForm.patchValue({ name: '', scorecardId: '' });
    component.submit();
    expect(storeSpy.dispatch).not.toHaveBeenCalled();
  });

  it('should dispatch createMatch when form is valid', () => {
    component.matchForm.patchValue({ name: 'Match 2', scorecardId: 'sc2', status: 'open', datePlayed: new Date() });
    component.submit();
    expect(storeSpy.dispatch).toHaveBeenCalled();
  });

  it('should add and remove members from lineup', () => {
    component.addMemberToLineup('m1');
    expect(component.lineUpsArray.value).toContain('m1');
    component.removeMemberFromLineup(0);
    expect(component.lineUpsArray.value).not.toContain('m1');
  });

  it('should clear lineup when removeGroup is called', () => {
    component.addMemberToLineup('m1');
    component.addMemberToLineup('m2');
    component.removeGroup(0);
    expect(component.lineUpsArray.length).toBe(0);
  });

  it('should reset form after submit', () => {
    component.matchForm.patchValue({ name: 'Match 3', scorecardId: 'sc3', status: 'open', datePlayed: new Date() });
    component.submit();
    expect(component.matchForm.get('name')?.value).toBeFalsy();
  });
});
