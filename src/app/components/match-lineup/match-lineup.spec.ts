import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatchLineupComponent } from './match-lineup';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { FormArray, FormControl } from '@angular/forms';

const mockLineup = [
  { playerId: '1', name: 'Player 1', team: 'A', firstName: 'Player', lastName: 'One',Email: 'mem1@example.com', author: { id: 'u2', email: 'other@example.com', name: 'Other User' } },
  { playerId: '2', name: 'Player 2', team: 'B', firstName: 'Player', lastName: 'Two',Email: 'mem1@example.com', author: { id: 'u2', email: 'other@example.com', name: 'Other User' } }
];

describe('MatchLineupComponent', () => {
  let component: MatchLineupComponent;
  let fixture: ComponentFixture<MatchLineupComponent>;
  let storeSpy: jasmine.SpyObj<Store<any>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    storeSpy.select.and.callFake((selector: any) => {
      return of([]);
    });

    await TestBed.configureTestingModule({
      imports: [MatchLineupComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchLineupComponent);
    component = fixture.componentInstance;
    component.lineUpsArray = new FormArray([new FormControl('1'), new FormControl('2')]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display lineup', fakeAsync(() => {
    component.members = mockLineup;
    fixture.detectChanges();
    tick();
    expect(component.members.length).toBeGreaterThan(0);
  }));

  it('should call onAddMembers', () => {
    spyOn(component, 'onAddMembers');
    component.onAddMembers();
    expect(component.onAddMembers).toHaveBeenCalled();
  });

  it('should call onRemoveGroup', () => {
    spyOn(component, 'onRemoveGroup');
    component.onRemoveGroup(0);
    expect(component.onRemoveGroup).toHaveBeenCalledWith(0);
  });
});
