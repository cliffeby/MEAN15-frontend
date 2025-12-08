import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HcapListComponent } from './hcap-list';
import { HCapService } from '../../services/hcapService';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HCap } from '../../models/hcap';

describe('HcapListComponent', () => {
  let component: HcapListComponent;
  let fixture: ComponentFixture<HcapListComponent>;
  let hcapServiceSpy: jasmine.SpyObj<HCapService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockHcaps: HCap[] = [
    { name: 'Alice', postedScore: 80, currentHCap: 12, newHCap: 11.5, 
        datePlayed: new Date(), usgaIndexForTodaysScore: { type: 1, 
            min: [-10, "USGA Index for today cannot be less than -10.0"], 
            max: [54,"USGA Index for today cannot be greater than 54.0" ]}, 
            handicap: 12, scoreId: 's1', scorecardId: 'sc1', matchId: 'm1', 
            memberId: 'mem1', userId: 'u1', createdAt: new Date(), 
            updatedAt: new Date() },
    { name: 'Bob', postedScore: 90, currentHCap: 22, newHCap: 21.5, 
        datePlayed: new Date(), usgaIndexForTodaysScore: { type: 1, 
            min: [-10, "USGA Index for today cannot be less than -10.0"],
            max: [54, "USGA Index for today cannot be greater than 54.0"]},
            handicap: 22, scoreId: 's2', scorecardId: 'sc2', matchId: 'm2', 
            memberId: 'mem2', userId: 'u2', createdAt: new Date(), 
            updatedAt: new Date() }
  ];

  beforeEach(async () => {
    hcapServiceSpy = jasmine.createSpyObj('HCapService', ['getAll']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    hcapServiceSpy.getAll.and.returnValue(of(mockHcaps));

    await TestBed.configureTestingModule({
      imports: [HcapListComponent],
      providers: [
        { provide: HCapService, useValue: hcapServiceSpy },
      ]
    })
      .overrideComponent(HcapListComponent, {
        set: {
          providers: [
            { provide: MatSnackBar, useValue: snackBarSpy }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(HcapListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load hcaps on init', () => {
    expect(hcapServiceSpy.getAll).toHaveBeenCalled();
    expect(component.hcaps.length).toBe(2);
    expect(component.filtered.length).toBe(2);
    expect(component.loading).toBeFalse();
  });

  it('should filter by name or memberId', () => {
    component.search = 'alice';
    component.applyFilter();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].name).toBe('Alice');

    component.search = 'mem2';
    component.applyFilter();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].memberId).toBe('mem2');
  });

  it('should handle empty search (no term) by returning all', () => {
    component.search = '';
    component.applyFilter();
    expect(component.filtered.length).toBe(2);
  });

  it('should update paged when paginator is not present', () => {
    // paginator is undefined in this test environment
    component.paginator = undefined as any;
    component.filtered = [...mockHcaps];
    component.updatePaged();
    expect(component.paged.length).toBe(2);
  });

  it('should respond to onPage and update pagination', () => {
    // attach a simple paginator-like object
    (component as any).paginator = { pageIndex: 0, pageSize: 1, firstPage: () => {}, page: of() } as any;
    component.filtered = [...mockHcaps];
    component.onPage({ pageIndex: 1, pageSize: 1 } as any);
    expect(component.pageIndex).toBe(1);
    expect(component.pageSize).toBe(1);
  });

  it('should show snackbar on load error', fakeAsync(() => {
    hcapServiceSpy.getAll.and.returnValue(throwError(() => new Error('fail')));
    snackBarSpy.open.calls.reset();
    component.loadHcaps();
    tick();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error loading HCap data', 'Close', { duration: 3000 });
    expect(component.loading).toBeFalse();
  }));
});
