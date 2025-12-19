import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MemberEditComponent } from './member-edit';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('MemberEditComponent', () => {
  let component: MemberEditComponent;
  let fixture: ComponentFixture<MemberEditComponent>;
  let memberServiceSpy: jasmine.SpyObj<MemberService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockMember = {
    _id: '1',
    firstName: 'Alice',
    lastName: 'Smith',
    Email: 'alice@example.com',
    usgaIndex: 10,
    fullName: 'Alice Smith',
    hidden: false
  } as any;

  beforeEach(async () => {
    memberServiceSpy = jasmine.createSpyObj('MemberService', ['getById', 'update']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getAuthorObject']);
    authServiceSpy.getAuthorObject.and.returnValue({ id: 'u1', email: 'test@example.com', name: 'Test User' });
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Default route snapshot provides id '1'
    const activatedRouteStub = { snapshot: { paramMap: { get: (k: string) => '1' } } } as unknown as ActivatedRoute;

    memberServiceSpy.getById.and.returnValue(of(mockMember));
    memberServiceSpy.update.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [MemberEditComponent],
      providers: [
        { provide: MemberService, useValue: memberServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: routerSpy }
      ]
    })
      .overrideComponent(MemberEditComponent, {
        set: {
          providers: [
            { provide: MatSnackBar, useValue: snackBarSpy }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load member on init when id present', () => {
    expect(memberServiceSpy.getById).toHaveBeenCalledWith('1');
    expect(component.memberForm.value.firstName).toBe('Alice');
    expect(component.loading).toBeFalse();
  });

  it('should show snackbar if loading member fails', fakeAsync(() => {
    memberServiceSpy.getById.and.returnValue(throwError(() => new Error('fail')));
    // call ngOnInit manually to re-run the load logic
    component.ngOnInit();
    tick();
    fixture.detectChanges();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error loading member', 'Close', { duration: 2000 });
    expect(component.loading).toBeFalse();
  }));

  it('should show validation errors for usgaIndex', () => {
    const control = component.memberForm.get('usgaIndex');
    control?.setValue(-20);
    control?.markAsTouched();
    expect(component.isUsgaIndexMinError).toBeTrue();
    control?.setValue(100);
    control?.markAsTouched();
    expect(component.isUsgaIndexMaxError).toBeTrue();
  });

  it('should submit update and navigate on success', fakeAsync(() => {
    // Ensure form valid and memberId present
    component.memberId = '1';
    component.memberForm.patchValue({ firstName: 'New', lastName: 'Name', Email: 'a@b.com' });
    memberServiceSpy.update.and.returnValue(of({} as any));
    component.submit();
    tick();
    fixture.detectChanges();
    expect(memberServiceSpy.update).toHaveBeenCalledWith('1', jasmine.any(Object));
    expect(snackBarSpy.open).toHaveBeenCalledWith('Member updated!', 'Close', { duration: 2000 });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/members']);
    expect(component.loading).toBeFalse();
  }));

  it('should show snackbar on update error', fakeAsync(() => {
    component.memberId = '1';
    component.memberForm.patchValue({ firstName: 'New', lastName: 'Name', Email: 'a@b.com' });
    memberServiceSpy.update.and.returnValue(throwError(() => ({ status: 500 })));
    component.submit();
    tick();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error updating member', 'Close', { duration: 2000 });
    expect(component.loading).toBeFalse();
  }));

  it('should not submit if form invalid or no memberId', () => {
    component.memberId = null;
    component.memberForm.patchValue({ firstName: '', lastName: '' });
    component.submit();
    expect(memberServiceSpy.update).not.toHaveBeenCalled();
  });
});
