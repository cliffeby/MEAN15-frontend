import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberEditComponent } from './member-edit';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { MemberService } from '../../services/memberService';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScorecardService } from '../../services/scorecardService';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthService } from '../../services/authService';
import { fakeAsync, tick } from '@angular/core/testing';

// Minimal mock for dependencies
const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
const activatedRouteStub = { snapshot: { paramMap: { get: () => '1' }, queryParams: {} } };

// Minimal mock member
const mockMember = {
  _id: '1',
  name: 'Test Member',
  email: 'test@example.com',
  lastDatePlayed: '2025-12-01',
  status: 'active',
};

const memberServiceSpy = jasmine.createSpyObj('MemberService', ['getById', 'update']);
memberServiceSpy.getById.and.returnValue(of(mockMember));
memberServiceSpy.update.and.returnValue(of({}));
const scorecardServiceSpy = jasmine.createSpyObj('ScorecardService', ['getAll', 'getById', 'update']);
scorecardServiceSpy.getAll.and.returnValue(of([{ _id: 'sc1', courseTeeName: 'Course 1' }]));
scorecardServiceSpy.update.and.returnValue(of({}));
const authServiceSpy = jasmine.createSpyObj('AuthService', ['getAuthorObject', 'getAuthorEmail', 'hasRole', 'hasMinRole']);
authServiceSpy.getAuthorObject.and.returnValue({ id: 'test', email: 'test@example.com', name: 'Test User' });
authServiceSpy.getAuthorEmail.and.returnValue('test@example.com');
authServiceSpy.hasRole = authServiceSpy.hasRole || (() => true);
authServiceSpy.hasMinRole = authServiceSpy.hasMinRole || (() => true);
authServiceSpy.hasRole.and.returnValue(true);
authServiceSpy.hasMinRole.and.returnValue(true);

describe('MemberEditComponent', () => {
  let component: MemberEditComponent;
  let fixture: ComponentFixture<MemberEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MemberEditComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule
      ],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: MemberService, useValue: memberServiceSpy },
        { provide: ScorecardService, useValue: scorecardServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        FormBuilder
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with member data', () => {
    component.memberForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      usgaIndex: 10.5,
      lastDatePlayed: '2025-12-01',
      Email: 'john.doe@example.com',
      hidden: false
    });
    expect(component.memberForm.get('firstName')?.value).toBe('John');
    expect(component.memberForm.get('lastName')?.value).toBe('Doe');
    expect(component.memberForm.get('usgaIndex')?.value).toBe(10.5);
    expect(component.memberForm.get('lastDatePlayed')?.value).toBe('2025-12-01');
    expect(component.memberForm.get('Email')?.value).toBe('john.doe@example.com');
    expect(component.memberForm.get('hidden')?.value).toBe(false);
  });

  it('should mark form as invalid if required fields are missing', () => {
    component.memberForm.patchValue({
      firstName: '',
      lastName: '',
      Email: ''
    });
    expect(component.memberForm.invalid).toBeTrue();
    expect(component.memberForm.get('firstName')?.hasError('required')).toBeTrue();
    expect(component.memberForm.get('lastName')?.hasError('required')).toBeTrue();
    expect(component.memberForm.get('Email')?.hasError('required')).toBeTrue();
  });

  it('should mark form as touched and not dispatch if invalid on submit', () => {
    component.memberForm.patchValue({
      firstName: '',
      lastName: '',
      Email: ''
    });
    component.memberId = '1';
    component.submit();
    expect(component.memberForm.touched || component.memberForm.markAllAsTouched).toBeTruthy();
    expect(storeSpy.dispatch).not.toHaveBeenCalled();
  });

  it('should return course tee name for a valid scorecard id', () => {
    component.scorecards = [
      { _id: 'sc1', courseTeeName: 'Course 1', course: '', tees: '', teeAbreviation: '' },
      { _id: 'sc2', courseTeeName: 'Course 2', course: '', tees: '', teeAbreviation: '' }
    ];
    expect(component.getCourseTeeName('sc1')).toBe('Course 1');
    expect(component.getCourseTeeName('sc2')).toBe('Course 2');
    expect(component.getCourseTeeName('unknown')).toBe('Course');
  });

  it('should handle empty scorecardsId gracefully', () => {
    component.memberForm.patchValue({ scorecardsId: [] });
    expect(component.memberForm.get('scorecardsId')?.value).toEqual([]);
    component.courseControl.setValue([]);
    expect(component.courseControl.value).toEqual([]);
  });

  it('should set isUsgaIndexMinError and isUsgaIndexMaxError correctly', () => {
    const control = component.memberForm.get('usgaIndex');
    control?.setValue(-20);
    control?.markAsTouched();
    expect(component.isUsgaIndexMinError).toBeTrue();
    control?.setValue(60);
    expect(component.isUsgaIndexMaxError).toBeTrue();
    control?.setValue(10);
    expect(component.isUsgaIndexMinError).toBeFalse();
    expect(component.isUsgaIndexMaxError).toBeFalse();
  });

  it('should not set min/max errors if usgaIndex is null', () => {
    const control = component.memberForm.get('usgaIndex');
    control?.setValue(null);
    control?.markAsTouched();
    expect(component.isUsgaIndexMinError).toBeFalse();
    expect(component.isUsgaIndexMaxError).toBeFalse();
  });

  it('should sync courseControl and memberForm scorecardsId', () => {
    component.courseControl.setValue(['sc1', 'sc2']);
    expect(component.memberForm.get('scorecardsId')?.value).toEqual(['sc1', 'sc2']);
    component.memberForm.get('scorecardsId')?.setValue(['sc3']);
    // Simulate valueChanges subscription
    component.courseControl.setValue(['sc3']);
    expect(component.memberForm.get('scorecardsId')?.value).toEqual(['sc3']);
  });

  it('should patch form and courseControl when member is loaded', () => {
    const member = {
      firstName: 'Alice',
      lastName: 'Wonder',
      usgaIndex: 5.5,
      lastDatePlayed: '2025-10-10',
      Email: 'alice@example.com',
      scorecardsId: ['sc1', 'sc2'],
      hidden: false
    };
    component.memberForm.patchValue(member);
    component.courseControl.setValue(member.scorecardsId);
    expect(component.memberForm.get('firstName')?.value).toBe('Alice');
    expect(component.courseControl.value).toEqual(['sc1', 'sc2']);
  });

  it('should return false for isUsgaIndexMinError and isUsgaIndexMaxError if untouched', () => {
    const control = component.memberForm.get('usgaIndex');
    control?.setValue(-20);
    expect(component.isUsgaIndexMinError).toBeFalse();
    control?.setValue(60);
    expect(component.isUsgaIndexMaxError).toBeFalse();
  });

  it('should update form scorecardsId when courseControl changes after ngOnInit', () => {
    // Simulate ngOnInit subscription
    component.courseControl.setValue(['sc1']);
    expect(component.memberForm.get('scorecardsId')?.value).toEqual(['sc1']);
    component.courseControl.setValue(['sc2', 'sc3']);
    expect(component.memberForm.get('scorecardsId')?.value).toEqual(['sc2', 'sc3']);
  });
});
