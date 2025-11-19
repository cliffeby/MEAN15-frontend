import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { Scorecard } from '../../services/scorecardService';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { MemberService } from '../../services/memberService';
import { AuthService } from '../../services/authService';
import { ScorecardService } from '../../services/scorecardService';
import { MemberSelectionDialogComponent } from '../member-selection-dialog/member-selection-dialog';
import * as MatchActions from '../../store/actions/match.actions';
import * as MatchSelectors from '../../store/selectors/match.selectors';
import * as ScorecardActions from '../../store/actions/scorecard.actions';
import * as ScorecardSelectors from '../../store/selectors/scorecard.selectors';

@Component({
  selector: 'app-match-edit',
  templateUrl: './match-edit.html',
  styleUrls: ['./match-edit.scss'],
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
    MatIconModule
  ]
})
export class MatchEditComponent implements OnInit, OnDestroy {
  matchForm: FormGroup;
  loading$: Observable<boolean>;
  currentMatch$: Observable<Match | null>;
  matchId: string | null = null;
  scorecards$: Observable<Scorecard[]>;
  scorecardsLoading$: Observable<boolean>;
  members$: Observable<Member[]>;
  membersLoading = false;
  selectedMemberId = '';
  scorecards: Scorecard[] = [];
  private destroy$ = new Subject<void>();

  statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private snackBar: MatSnackBar,
    private memberService: MemberService,
    private authService: AuthService,
    private dialog: MatDialog,
    private scorecardService: ScorecardService
  ) {
    this.matchForm = this.fb.group({
      name: ['', Validators.required],
      scorecardId: ['', Validators.required],
      scGroupName: [''],
      status: ['open', Validators.required],
      lineUps: this.fb.array([]),
      datePlayed: [new Date(), Validators.required],
      user: [this.getCurrentUserEmail(), Validators.required]
    });

    this.loading$ = this.store.select(MatchSelectors.selectMatchesLoading);
    this.currentMatch$ = this.store.select(MatchSelectors.selectCurrentMatch);
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
  }

  ngOnInit() {
    console.log('Match Edit ngOnInit started');
    
    // Immediately try to load scorecards from service
    this.loadScorecardsDirectly();
    
    // Also dispatch store action as backup
    this.store.dispatch(ScorecardActions.loadScorecards());
    
    // Load scorecard data and store in component property
    this.scorecards$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (scorecards) => {
        console.log('Scorecards loaded from store:', scorecards);
        if (scorecards && scorecards.length > 0) {
          this.scorecards = scorecards;
          console.log('Using store scorecards:', this.scorecards);
        }
      },
      error: (error) => console.error('Error loading scorecards from store:', error)
    });

    // Additional fallback after 1 second
    setTimeout(() => {
      console.log('Fallback check - scorecards length:', this.scorecards.length);
      if (this.scorecards.length === 0) {
        this.loadScorecardsDirectly();
      }
    }, 1000);
    
    this.matchId = this.route.snapshot.paramMap.get('id');
    
    if (this.matchId) {
      // Dispatch action to load the match
      this.store.dispatch(MatchActions.loadMatch({ id: this.matchId }));
      
      // Subscribe to current match and populate form when it changes
      this.currentMatch$
        .pipe(takeUntil(this.destroy$))
        .subscribe(match => {
          if (match) {
            this.populateForm(match);
          }
        });
    }
  }

  private getCurrentUserEmail(): string {
    const user = this.authService.user;
    return user?.email || user?.username || 'unknown';
  }

  private loadScorecardsDirectly(): void {
    console.log('Loading scorecards directly from service...');
    this.scorecardService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.log('Direct service response:', response);
        if (response?.scorecards && Array.isArray(response.scorecards)) {
          this.scorecards = response.scorecards;
          console.log('Successfully loaded scorecards:', this.scorecards);
        } else if (Array.isArray(response)) {
          this.scorecards = response;
          console.log('Response was array, using directly:', this.scorecards);
        } else {
          console.warn('Unexpected response format:', response);
          this.scorecards = [];
        }
      },
      error: (error) => {
        console.error('Error loading scorecards directly:', error);
        this.scorecards = [];
      }
    });
  }

  populateForm(match: Match) {
    this.matchForm.patchValue({
      name: match.name,
      scorecardId: match.scorecardId,
      scGroupName: match.scGroupName,
      status: match.status,
      datePlayed: match.datePlayed ? new Date(match.datePlayed) : new Date(),
      user: match.user
    });
    
    // Fix scorecardId if it's an object instead of a string
    this.fixScorecardIdValue();

    // Populate lineUps array
    const lineUpsArray = this.lineUpsArray;
    lineUpsArray.clear();
    if (match.lineUps && Array.isArray(match.lineUps)) {
      match.lineUps.forEach(memberId => {
        lineUpsArray.push(this.fb.control(memberId));
      });
    }
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
    if (this.matchForm.invalid || !this.matchId) return;
    
    const formValue = { ...this.matchForm.value };
    // Convert date to ISO string if it's a Date object
    if (formValue.datePlayed instanceof Date) {
      formValue.datePlayed = formValue.datePlayed.toISOString();
    }

    // Dispatch the update action - effects will handle the API call and navigation
    this.store.dispatch(MatchActions.updateMatch({ 
      id: this.matchId, 
      match: formValue 
    }));
  }

  compareScorecardsById(o1: any, o2: any): boolean {
    if (typeof o1 === 'string' && typeof o2 === 'string') {
      return o1 === o2;
    }
    if (typeof o1 === 'object' && o1 && typeof o2 === 'string') {
      return o1._id === o2;
    }
    if (typeof o1 === 'string' && typeof o2 === 'object' && o2) {
      return o1 === o2._id;
    }
    return false;
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

  fixScorecardIdValue(): void {
    const scorecardControl = this.matchForm.get('scorecardId');
    const value = scorecardControl?.value;
    
    if (typeof value === 'object' && value && value._id) {
      scorecardControl.setValue(value._id);
    }
  }

  onScorecardChange(scorecardId: string) {
    // Use the scorecard selector to find the specific scorecard
    this.store.select(ScorecardSelectors.selectScorecardById(scorecardId))
      .pipe(takeUntil(this.destroy$))
      .subscribe(selectedScorecard => {
        if (selectedScorecard) {
          this.matchForm.patchValue({
            scGroupName: selectedScorecard.groupName || selectedScorecard.name || ''
          });
        }
      });
  }

  openMemberSelectionDialog() {
    this.members$.pipe(takeUntil(this.destroy$)).subscribe(members => {
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

  cancel() {
    this.router.navigate(['/matches']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}