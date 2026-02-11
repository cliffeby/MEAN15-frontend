
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatchEditComponent } from './match-edit';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { ScorecardService } from '../../services/scorecardService';

const mockMatch = {
  _id: '1',
  name: 'Match 1',
  scGroupName: 'Course 1',
  datePlayed: '2025-12-01',
  status: 'open',
  scorecardId: 'sc1',
  lineUps: ['m1', 'm2'],
  foursomeIdsTEMP: [['m1', 'm2']],
  partnerIdsTEMP: [['m1', 'm2']],
  author: { id: 'u1', email: 'test@example.com', name: 'Test User' }
};

describe('MatchEditComponent', () => {
  let component: MatchEditComponent;
  let fixture: ComponentFixture<MatchEditComponent>;
  let storeSpy: jasmine.SpyObj<Store<any>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let memberServiceSpy: jasmine.SpyObj<MemberService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let scorecardServiceSpy: jasmine.SpyObj<ScorecardService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteStub: any;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    memberServiceSpy = jasmine.createSpyObj('MemberService', ['getAll']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['hasRole', 'getAuthorObject']);
    authServiceSpy.hasRole.and.returnValue(false);
    authServiceSpy.getAuthorObject.and.returnValue({ id: 'u1', email: 'test@example.com', name: 'Test User' });
    scorecardServiceSpy = jasmine.createSpyObj('ScorecardService', ['getAll']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    activatedRouteStub = { snapshot: { paramMap: { get: (k: string) => k === 'id' ? '1' : null }, queryParams: {} } };

    storeSpy.select.and.callFake((selector: any) => {
      if (selector.name === 'selectCurrentMatch') return of(mockMatch);
      if (selector.name === 'selectAllScorecards') return of([]);
      if (selector.name === 'selectScorecardsLoading') return of(false);
      return of([]);
    });
    memberServiceSpy.getAll.and.returnValue(of([]));
    scorecardServiceSpy.getAll.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [MatchEditComponent, ReactiveFormsModule, HttpClientTestingModule],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MemberService, useValue: memberServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ScorecardService, useValue: scorecardServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        FormBuilder
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    storeSpy.dispatch.calls.reset();
    routerSpy.navigate.calls.reset();
    dialogSpy.open.calls.reset();
    // Default MatDialog mock: always return a dialogRef with afterClosed, componentInstance, close, and data
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true),
      componentInstance: { data: { actions: [], buttons: [] }, close: () => {} },
      close: () => {},
      data: { actions: [], buttons: [] },
    } as any);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with match data', () => {
    component.populateForm(mockMatch);
    expect(component.matchForm.get('name')?.value).toBe('Match 1');
    expect(component.matchForm.get('scorecardId')?.value).toBe('sc1');
    expect(component.lineUpsArray.value).toEqual(['m1', 'm2']);
    expect(component.matchForm.get('author')?.value).toEqual(mockMatch.author);
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

  it('should not submit if form is invalid', () => {
    component.matchId = '1';
    component.matchForm.patchValue({ name: '', scorecardId: '' });
    component.submit();
    expect(storeSpy.dispatch).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should dispatch updateMatch and navigate when form is valid and no players removed', () => {
    component.matchId = '1';
    component.populateForm(mockMatch);
    component.matchForm.patchValue({ name: 'Match 2', scorecardId: 'sc2', status: 'open', datePlayed: new Date(), author: mockMatch.author });
    component.lineUpsArray.clear();
    component.lineUpsArray.push(component['fb'].control('m1'));
    component.lineUpsArray.push(component['fb'].control('m2'));
    component.submit();
    expect(storeSpy.dispatch).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalled();
  });

  xit('should open dialog if players are removed', fakeAsync(() => {
    component.matchId = '1';
    component.ngOnInit();
    fixture.detectChanges();
    component.populateForm(mockMatch);
    // Remove one player
    component.lineUpsArray.clear();
    component.lineUpsArray.push(component['fb'].control('m1'));
    // Ensure currentMatch$ emits the correct value
    component.currentMatch$ = of(mockMatch);
    component.submit();
    tick();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(storeSpy.dispatch).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalled();
  }));

  xit('should not dispatch updateMatch if dialog is cancelled', fakeAsync(() => {
    component.matchId = '1';
    component.ngOnInit();
    fixture.detectChanges();
    component.populateForm(mockMatch);
    // Patch dialog to return false for this test only
    const arrayProxyCancel = new Proxy({} as Record<string, any>, {
      get: (target: Record<string, any>, prop: string | symbol) =>
        typeof prop === 'string' && prop in target ? target[prop] : []
    });
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(false),
      componentInstance: { data: arrayProxyCancel, close: () => {} },
      close: () => {},
      data: arrayProxyCancel,
    } as any);
    // Remove one player from the original lineup
    component.lineUpsArray.clear();
    component.lineUpsArray.push(component['fb'].control('m1'));
    // Ensure currentMatch$ emits the correct value
    component.currentMatch$ = of(mockMatch);
    component.submit();
    tick();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(storeSpy.dispatch).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  }));

  it('should reset and repopulate form', () => {
    component.populateForm(mockMatch);
    expect(component.matchForm.get('name')?.value).toBe('Match 1');
    component.matchForm.reset();
    expect(component.matchForm.get('name')?.value).toBeFalsy();
    component.populateForm(mockMatch);
    expect(component.matchForm.get('name')?.value).toBe('Match 1');
  });

  it('should call cancel and navigate', () => {
    component.cancel();
    expect(routerSpy.navigate).toHaveBeenCalled();
  });

  it('should handle pairing update', () => {
    const event = { foursomeIdsTEMP: [['m1', 'm2']], partnerIdsTEMP: [['m1', 'm2']] };
    component.onPairingUpdated(event);
    expect(component.matchForm.get('foursomeIdsTEMP')?.value).toEqual([['m1', 'm2']]);
    expect(component.matchForm.get('partnerIdsTEMP')?.value).toEqual([['m1', 'm2']]);
  });
});
