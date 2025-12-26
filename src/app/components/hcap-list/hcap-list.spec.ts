import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HcapListComponent } from './hcap-list';
import { HCapService } from '../../services/hcapService';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HCap } from '../../models/hcap';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MsalService } from '@azure/msal-angular';
import { ScoreService } from '../../services/scoreService';
import { Score } from '../../models/score';

describe('HcapListComponent', () => {
  let component: HcapListComponent;
  let fixture: ComponentFixture<HcapListComponent>;
  let hcapServiceSpy: jasmine.SpyObj<HCapService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let scoreServiceSpy: jasmine.SpyObj<ScoreService>;

  const mockHcaps: HCap[] = [
    {
      name: 'Alice',
      postedScore: 80,
      currentHCap: 12,
      newHCap: '11.5',
      datePlayed: new Date(),
      usgaIndexForTodaysScore: {
        type: 1,
        min: [-10, 'USGA Index for today cannot be less than -10.0'],
        max: [54, 'USGA Index for today cannot be greater than 54.0'],
      },
      handicapDifferential: 12,
      scoreId: 's1',
      scorecardId: 'sc1',
      matchId: 'm1',
      memberId: 'mem1',
      author: { id: 'u1', email: 'test@example.com', name: 'Test User' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Bob',
      postedScore: 90,
      currentHCap: 22,
      newHCap: '21.5',
      datePlayed: new Date(),
      usgaIndexForTodaysScore: {
        type: 1,
        min: [-10, 'USGA Index for today cannot be less than -10.0'],
        max: [54, 'USGA Index for today cannot be greater than 54.0'],
      },
      handicapDifferential: 22,
      scoreId: 's2',
      scorecardId: 'sc2',
      matchId: 'm2',
      memberId: 'mem2',
      author: { id: 'u1', email: 'test@example.com', name: 'Test User' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockScores: Score[] = [
    {
      _id: 's1',
      name: 'Score 1',
      score: 80,
      postedScore: 80,
      scores: [],
      scoresToPost: [],
      scoringMethod: 'total',
      scoreRecordType: 'total',
      handicap: 12,
      scorecardId: 'sc1',
      memberId: 'mem1',
      scSlope: 113,
      scRating: 72,
      datePlayed: new Date().toISOString(),
    },
    {
      _id: 's2',
      name: 'Score 2',
      score: 90,
      postedScore: 90,
      scores: [],
      scoresToPost: [],
      scoringMethod: 'total',
      scoreRecordType: 'total',
      handicap: 22,
      scorecardId: 'sc2',
      memberId: 'mem2',
      scSlope: 113,
      scRating: 72,
      datePlayed: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    hcapServiceSpy = jasmine.createSpyObj('HCapService', ['getAll']);
    scoreServiceSpy = jasmine.createSpyObj('ScoreService', ['getAll']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const msalServiceStub = {};

    hcapServiceSpy.getAll.and.returnValue(of(mockHcaps));
    scoreServiceSpy.getAll.and.returnValue(of({ scores: mockScores }));

    await TestBed.configureTestingModule({
      imports: [HcapListComponent, HttpClientTestingModule],
      providers: [
        { provide: HCapService, useValue: hcapServiceSpy },
        { provide: ScoreService, useValue: scoreServiceSpy },
        { provide: MsalService, useValue: msalServiceStub },
      ],
    })
      .overrideComponent(HcapListComponent, {
        set: {
          providers: [{ provide: MatSnackBar, useValue: snackBarSpy }],
        },
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
    (component as any).paginator = {
      pageIndex: 0,
      pageSize: 1,
      firstPage: () => {},
      page: of(),
    } as any;
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
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error loading HCap data', 'Close', {
      duration: 3000,
    });
    expect(component.loading).toBeFalse();
  }));
});
