import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MemberFormComponent } from './member-form';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

describe('MemberFormComponent', () => {
  let component: MemberFormComponent;
  let fixture: ComponentFixture<MemberFormComponent>;
  let memberServiceSpy: jasmine.SpyObj<MemberService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    memberServiceSpy = jasmine.createSpyObj('MemberService', ['create']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getAuthorObject']);
    authServiceSpy.getAuthorObject.and.returnValue({ id: 'u1', email: 'test@example.com', name: 'Test User' });
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [MemberFormComponent],
      providers: [
        { provide: MemberService, useValue: memberServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    })
      .overrideComponent(MemberFormComponent, {
        set: {
          providers: [
            { provide: MatSnackBar, useValue: snackBarSpy }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show validation errors for usgaIndex', () => {
    const control = component.memberForm.get('usgaIndex');
    control?.setValue(-20);
    control?.markAsTouched();
    expect(component.isUsgaIndexMinError).toBeTrue();
    control?.setValue(100);
    control?.markAsTouched();
    expect(component.isUsgaIndexMaxError).toBeTrue();
  });

  it('should not submit when form invalid', () => {
    component.memberForm.patchValue({ firstName: '', lastName: '', Email: '' });
    component.submit();
    expect(memberServiceSpy.create).not.toHaveBeenCalled();
  });

  it('should call create and reset form on success', fakeAsync(() => {
    const payload = { firstName: 'A', lastName: 'B', Email: 'a@b.com' };
    component.memberForm.patchValue(payload as any);
    spyOn(component.memberForm, 'reset');
    memberServiceSpy.create.and.returnValue(of({} as any));

    component.submit();
    tick();
    fixture.detectChanges();

    expect(memberServiceSpy.create).toHaveBeenCalledWith(jasmine.objectContaining(payload));
    expect(snackBarSpy.open).toHaveBeenCalledWith('Member created!', 'Close', { duration: 2000 });
    expect(component.memberForm.reset).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  }));

  it('should show snackbar on create error', fakeAsync(() => {
    component.memberForm.patchValue({ firstName: 'A', lastName: 'B', Email: 'a@b.com' } as any);
    memberServiceSpy.create.and.returnValue(throwError(() => ({ status: 500 })));
    component.submit();
    tick();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error creating member', 'Close', { duration: 2000 });
    expect(component.loading).toBeFalse();
  }));
});
