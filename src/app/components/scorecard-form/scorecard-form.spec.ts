import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ScorecardFormComponent } from './scorecard-form';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

const mockScorecard = {
  _id: '1',
  course: 'Group 1',
  tees: 'Course 1',
  teeAbreviation: 'C1',
  rating: 72.5,
  slope: 130,
  par: 72,
  author: { id: 'u1', email: 'test@example.com', name: 'Test User' }
};

describe('ScorecardFormComponent', () => {
  let component: ScorecardFormComponent;
  let fixture: ComponentFixture<ScorecardFormComponent>;
  let storeSpy: jasmine.SpyObj<Store<any>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const activatedRouteStub = { snapshot: { paramMap: { get: (k: string) => null } } } as unknown as ActivatedRoute;

    storeSpy.select.and.callFake((selector: any) => {
      if (selector.name === 'selectScorecardsLoading') return of(false);
      if (selector.name === 'selectCurrentScorecard') return of(mockScorecard);
      return of([]);
    });

    await TestBed.configureTestingModule({
      imports: [ScorecardFormComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScorecardFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with scorecard data in edit mode', fakeAsync(() => {
    component.isEditMode = true;
    component.scorecardId = '1';
    component.currentScorecard$ = of(mockScorecard);
    component.populateForm(mockScorecard);
    fixture.detectChanges();
    tick();
    expect(component.scorecardForm.value.tees).toBe('Course 1');
    expect(component.scorecardForm.value.course).toBe('Group 1');
  }));

  it('should not submit if form is invalid', () => {
    component.scorecardForm.patchValue({ tees: '', course: '' });
    component.onSubmit();
    expect(storeSpy.dispatch).not.toHaveBeenCalled();
  });

  it('should dispatch updateScorecard in edit mode', () => {
    component.isEditMode = true;
    component.scorecardId = '1';
    component.scorecardForm.patchValue({ tees: 'Course 1', course: 'Group 1', rating: 72.5, slope: 130, par: 72 });
    component.onSubmit();
    expect(storeSpy.dispatch).toHaveBeenCalled();
  });

  it('should dispatch createScorecard in add mode', () => {
    component.isEditMode = false;
    component.scorecardForm.patchValue({ tees: 'Course 2', course: 'Group 2', rating: 70, slope: 120, par: 70 });
    component.onSubmit();
    expect(storeSpy.dispatch).toHaveBeenCalled();
  });

  it('should show snackbar on success', () => {
    snackBarSpy.open('Scorecard saved!', 'Close', { duration: 2000 });
    expect(snackBarSpy.open).toHaveBeenCalled();
  });
});
