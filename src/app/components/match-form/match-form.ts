import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { Scorecard } from '../../services/scorecardService';
import { Member } from '../../models/member';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { MemberSelectionDialogComponent } from '../member-selection-dialog/member-selection-dialog';
import { MatchLineupComponent } from '../match-lineup/match-lineup';
import * as MatchActions from '../../store/actions/match.actions';
import * as ScorecardActions from '../../store/actions/scorecard.actions';
import { selectMatchesLoading, selectMatchesError } from '../../store/selectors/match.selectors';
import * as ScorecardSelectors from '../../store/selectors/scorecard.selectors';
import { ScorecardService } from '../../services/scorecardService';
import { getWeekNumber } from '../../utils/date-utils';

@Component({
  selector: 'app-match-form',
  templateUrl: './match-form.html',
  styleUrls: ['./match-form.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatDialogModule,
    MatIconModule,
    MatchLineupComponent
  ]
})
export class MatchFormComponent implements OnInit, OnDestroy {
    onRemoveGroup(startIndex: number): void {
      this.removeGroup(startIndex);
    }

    onAddMembers(): void {
      this.openMemberSelectionDialog();
    }
  defaultName: string = '';
  matchForm: FormGroup;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  scorecards$: Observable<Scorecard[]>;
  scorecardsLoading$: Observable<boolean>;
  members$: Observable<Member[]>;
  membersLoading = false;
  selectedMemberId = '';
  scorecards: Scorecard[] = [];
  private unsubscribe$ = new Subject<void>();

  statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private memberService: MemberService,
    private authService: AuthService,
    private dialog: MatDialog,
    private scorecardService: ScorecardService
  ) {
    this.loading$ = this.store.select(selectMatchesLoading);
    this.error$ = this.store.select(selectMatchesError);
    this.scorecards$ = this.store.select(ScorecardSelectors.selectAllScorecards);
    this.scorecardsLoading$ = this.store.select(ScorecardSelectors.selectScorecardsLoading);
    // Try to load members, with fallback to mock data if service fails
    this.members$ = this.memberService.getAll().pipe(
      catchError((error: any) => {
        console.error('Failed to load members from service, using mock data:', error);
        // Return mock data for testing
        return of([
          { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', Email: 'john@example.com', user: 'admin', usgaIndex: 12.5 },
          { _id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', Email: 'jane@example.com', user: 'admin', usgaIndex: 8.2 },
          { _id: '3', firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com', Email: 'bob@example.com', user: 'admin', usgaIndex: 15.7 }
        ]);
      })
    );
    
    // Debug: Log member data
    this.members$.subscribe({
      next: (members) => console.log('Members loaded:', members),
      error: (error) => console.error('Error loading members:', error)
    });
    this.matchForm = this.fb.group({
      name: ['', Validators.required],
      scorecardId: ['', Validators.required],
      scGroupName: [''],
      status: ['open', Validators.required],
      lineUps: this.fb.array([]),
      datePlayed: [new Date(), Validators.required],
      user: [this.getCurrentUserEmail(), Validators.required]
    });
  }

  ngOnInit() {
  // Load default name from localStorage
  this.defaultName = localStorage.getItem('defaultMatchName') || '';

  // Generate proposed match name
  // const now = new Date();
  // const month = now.toLocaleString('en-US', { month: 'short' });
  // const day = String(now.getDate()).padStart(2, '0');
  // const proposedName = `${this.defaultName}${this.defaultName ? '_' : ''}${month}${day}`;
  const proposedName = `${this.defaultName}${this.defaultName ? '_' : ''}${getWeekNumber(new Date())}`;
  this.matchForm.get('name')?.setValue(proposedName);
    // Dispatch action to load scorecards
    this.store.dispatch(ScorecardActions.loadScorecards());
    
    // Load scorecard data and store in component property
    this.scorecards$.pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: (scorecards) => {
        this.scorecards = scorecards || [];
      },
      error: (error) => console.error('Error loading scorecards:', error)
    });

    // Fallback: Load scorecards directly from service if store is empty
    setTimeout(() => {
      if (this.scorecards.length === 0) {
        this.scorecardService.getAll().pipe(takeUntil(this.unsubscribe$)).subscribe({
          next: (response) => {
            const scorecards = response?.scorecards || response || [];
            this.scorecards = scorecards;
          },
          error: (error) => console.error('Error loading scorecards directly:', error)
        });
      }
    }, 2000);
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private getCurrentUserEmail(): string {
    const user = this.authService.user;
    return user?.email || user?.username || 'unknown';
  }

  trackByScorecard(index: number, scorecard: Scorecard): string {
    return scorecard._id || index.toString();
  }

  getScorecardIdForDisplay(): string {
    const value = this.matchForm.get('scorecardId')?.value;
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value && value._id) {
      return value._id;
    }
    return 'None';
  }

  onScorecardChange(scorecardId: string) {
    // Use the scorecard selector to find the specific scorecard
    this.store.select(ScorecardSelectors.selectScorecardById(scorecardId))
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(selectedScorecard => {
        if (selectedScorecard) {
          this.matchForm.patchValue({
            scGroupName: selectedScorecard.groupName || selectedScorecard.name || ''
          });
        }
      });
  }

  get lineUpsArray(): FormArray {
    return this.matchForm.get('lineUps') as FormArray;
  }

  addMemberToLineup(memberId: string) {
    if (memberId && !this.lineUpsArray.value.includes(memberId)) {
      this.lineUpsArray.push(this.fb.control(memberId));
      this.selectedMemberId = ''; // Clear selection after adding
    }
  }

  onMemberSelectionChange(memberId: string) {
    this.selectedMemberId = memberId;
  }

  removeMemberFromLineup(index: number) {
    this.lineUpsArray.removeAt(index);
  }

  getMemberById(memberId: string, members: Member[] | null): Member | undefined {
    return members?.find(m => m._id === memberId);
  }

  getMemberDisplayName(member: Member): string {
    return `${member.firstName} ${member.lastName || ''}`.trim();
  }

  getCompactName(member: Member): string {
    const firstInitial = member.firstName ? member.firstName.charAt(0).toUpperCase() : '';
    const lastName = member.lastName || 'Unknown';
    return `${lastName}, ${firstInitial}`;
  }

  removeGroup(startIndex: number): void {
    // Remove up to 4 members starting from the given index
    const endIndex = Math.min(startIndex + 4, this.lineUpsArray.length);
    for (let i = endIndex - 1; i >= startIndex; i--) {
      this.lineUpsArray.removeAt(i);
    }
  }

  submit() {
    if (this.matchForm.invalid) return;
    
    const formValue = { ...this.matchForm.value };
    // Convert date to ISO string if it's a Date object
    if (formValue.datePlayed instanceof Date) {
      formValue.datePlayed = formValue.datePlayed.toISOString();
    }

    // Dispatch NgRx action to create match
    this.store.dispatch(MatchActions.createMatch({ match: formValue }));
    
    // Reset form after dispatching (effects will handle navigation and notifications)
    this.resetForm();
  }

  openMemberSelectionDialog() {
    this.members$.pipe(takeUntil(this.unsubscribe$)).subscribe(members => {
      const dialogRef = this.dialog.open(MemberSelectionDialogComponent, {
        width: '600px',
        maxHeight: '80vh',
        data: {
          members: members,
          currentLineup: this.lineUpsArray.value
        }
      });

      dialogRef.afterClosed().subscribe(selectedMemberIds => {
        console.log('Dialog closed with result:', selectedMemberIds);
        if (selectedMemberIds) {
          console.log('Updating lineup with', selectedMemberIds.length, 'members');
          // Clear current lineup
          this.lineUpsArray.clear();
          
          // Add selected members
          selectedMemberIds.forEach((memberId: string) => {
            this.lineUpsArray.push(this.fb.control(memberId));
          });
          console.log('Final lineup array:', this.lineUpsArray.value);
        } else {
          console.log('Dialog was cancelled or returned no selection');
        }
      });
    });
  }

  private resetForm() {
    this.matchForm.reset();
    // Reset simple control values
    this.matchForm.patchValue({
      status: 'open',
      datePlayed: new Date()
    });

    // Ensure the FormArray is cleared (patching with a non-array causes forEach errors)
    try {
      this.lineUpsArray.clear();
    } catch (err) {
      // Fallback: if lineUpsArray is not available for some reason, ensure the control value is an empty array
      const control = this.matchForm.get('lineUps');
      if (control) {
        control.setValue([] as any);
      }
    }
  }
}