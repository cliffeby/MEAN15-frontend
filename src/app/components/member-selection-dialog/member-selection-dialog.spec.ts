import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberSelectionDialogComponent, MemberSelectionDialogData } from './member-selection-dialog';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('MemberSelectionDialogComponent', () => {
  let component: MemberSelectionDialogComponent;
  let fixture: ComponentFixture<MemberSelectionDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<MemberSelectionDialogComponent>>;

  const members = [
    { _id: 'm1', firstName: 'Alice', lastName: 'Smith', Email: 'alice@example.com', usgaIndex: 10 },
    { _id: 'm2', firstName: 'Bob', lastName: 'Jones', Email: 'bob@example.com', usgaIndex: 20 }
  ] as any;

  const data: MemberSelectionDialogData = {
    members,
    currentLineup: ['m2']
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [MemberSelectionDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberSelectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with members and preselected lineup', () => {
    expect(component.allMembers.length).toBe(2);
    expect(component.filteredMembers.length).toBe(2);
    expect(component.selectedMemberIds).toEqual(['m2']);
  });

  it('should filter members by name, email or usgaIndex', () => {
    component.searchTerm = 'alice';
    component.filterMembers();
    expect(component.filteredMembers.length).toBe(1);

    component.searchTerm = 'bob@example.com';
    component.filterMembers();
    expect(component.filteredMembers.length).toBe(1);

    component.searchTerm = '20';
    component.filterMembers();
    expect(component.filteredMembers.length).toBe(1);

    component.searchTerm = '';
    component.filterMembers();
    expect(component.filteredMembers.length).toBe(2);
  });

  it('should toggle member selection (add/remove)', () => {
    // m1 not selected initially
    expect(component.isSelected('m1')).toBeFalse();
    component.toggleMember('m1');
    expect(component.isSelected('m1')).toBeTrue();
    // toggling again removes
    component.toggleMember('m1');
    expect(component.isSelected('m1')).toBeFalse();
  });

  it('should detect original lineup membership', () => {
    expect(component.isInOriginalLineup('m2')).toBeTrue();
    expect(component.isInOriginalLineup('m1')).toBeFalse();
  });

  it('selectAll should select filtered members', () => {
    component.searchTerm = '';
    component.filterMembers();
    component.selectAll();
    expect(component.selectedMemberIds).toContain('m1');
    expect(component.selectedMemberIds).toContain('m2');
  });

  it('clearAll should clear selection', () => {
    component.selectAll();
    expect(component.selectedMemberIds.length).toBeGreaterThan(0);
    component.clearAll();
    expect(component.selectedMemberIds.length).toBe(0);
  });

  it('cancel should close dialog without data', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });

  it('confirm should close dialog with selected member ids', () => {
    component.clearAll();
    component.toggleMember('m1');
    component.toggleMember('m2');
    component.confirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(component.selectedMemberIds);
  });
});
