import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, switchMap, retryWhen, delay, take } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

interface ScoresApiResponse {
  success: boolean;
  count: number;
  scores: Score[];
}

import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScoreService } from '../../services/scoreService';
import { ScorecardService, Scorecard } from '../../services/scorecardService';
import { AuthService } from '../../services/authService';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { Score } from '../../models/score';

interface PlayerScore {
  member: Member;
  scores: (number | null)[];
  frontNine: number;
  backNine: number;
  total: number;
  handicap: number;
  netScore: number;
  existingScoreId?: string;
}

@Component({
  selector: 'app-score-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: './score-entry.html',
  styleUrls: ['./score-entry.scss']
})
export class ScoreEntryComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private confirmDialog = inject(ConfirmDialogService);
  private matchService = inject(MatchService);
  private memberService = inject(MemberService);
  private scoreService = inject(ScoreService);
  private scorecardService = inject(ScorecardService);
  private authService = inject(AuthService);

  matchId!: string;
  match: Match | null = null;
  scorecard: Scorecard | null = null;
  scorecardId: string = '';
  playerScores: PlayerScore[] = [];
  scoreForm!: FormGroup;
  loading = false;
  saving = false;
  isMatchCompleted = false;  // Default to false to allow editing initially
  private saveSubject = new Subject<void>();
  private lastSaveTime = 0;
  private readonly SAVE_COOLDOWN = 2000; // 2 seconds between saves

  displayedColumns: string[] = ['player', 'handicap'];
  holeColumns: string[] = [];

  ngOnInit(): void {
    console.log('🚀 ScoreEntryComponent ngOnInit called');
    this.matchId = this.route.snapshot.params['id'];
    console.log('🔥 Score entry initialized:', {
      matchId: this.matchId,
      routeParams: this.route.snapshot.params,
      routeURL: this.route.snapshot.url,
      timestamp: new Date().toISOString()
    });
    
    this.initializeForm();
    this.setupDebouncedSaving();
    this.loadMatchData();
  }

  private setupDebouncedSaving(): void {
    // Debounce save operations to prevent rapid API calls
    this.saveSubject.pipe(
      debounceTime(1000), // Wait 1 second after last save request
      distinctUntilChanged(),
      switchMap(() => this.performSave())
    ).subscribe({
      error: (error) => {
        console.error('Debounced save error:', error);
        this.saving = false;
      }
    });
  }

  private initializeForm(): void {
    this.scoreForm = this.fb.group({
      players: this.fb.array([])
    });
  }

  private loadMatchData(): void {
    this.loading = true;
    
    console.log('Loading match with ID:', this.matchId);
    console.log('Match ID type:', typeof this.matchId);
    console.log('Match ID valid:', !!this.matchId);
    
      if (this.match && this.match.status === 'open') {
        // Update match status to 'needs_review' via MatchService
        if (typeof this.match._id === 'string') {
          this.matchService.updateMatchStatus(this.match._id, 'needs_review').subscribe({
            next: (res) => {
              if (this.match) {
                this.match.status = 'needs_review';
              }
              console.log('Match status updated to needs_review:', res);
            },
            error: (err) => {
              console.error('Failed to update match status:', err);
              this.snackBar.open('Failed to update match status', 'Close', { duration: 4000, panelClass: ['warning-snackbar'] });
            }
          });
        } else {
          console.error('Match _id is not a string:', this.match._id);
        }
      this.snackBar.open('Invalid match ID', 'Close', { duration: 3000 });
      this.router.navigate(['/matches']);
      this.loading = false;
      return;
    }
    
    this.matchService.getById(this.matchId).pipe(
      retryWhen(errors => 
        errors.pipe(
          delay(1000),
          take(3) // Retry up to 3 times with 1 second delay
        )
      )
    ).subscribe({
      next: (response: any) => {
        console.log('Raw match service response:', response);
        
        // Handle different response formats
        const match = response?.match || response;
        
        if (!match) {
          console.error('No match data in response:', response);
          this.snackBar.open('Match not found', 'Close', { duration: 3000 });
          this.router.navigate(['/matches']);
          this.loading = false;
          return;
        }
        
        console.log('Loaded match:', match);
        console.log('Match scorecardId type:', typeof match.scorecardId);
        console.log('Match scorecardId value:', match.scorecardId);
        console.log('Match scorecardId truthy:', !!match.scorecardId);
        
        this.match = match;
        
        // Check match status to determine if scores are locked
        console.log('Match status debug:', {
          status: match.status,
          statusType: typeof match.status,
          isCompleted: match.status === 'completed',
          matchData: match
        });
        
        // Set match completion status with proper fallback and validation
        const matchStatus = match?.status;
        if (matchStatus === 'completed') {
          this.isMatchCompleted = true;
        } else {
          this.isMatchCompleted = false; // Explicitly set to false for any other status
        }
        
        // Extra safety check - ensure isMatchCompleted is always boolean
        if (typeof this.isMatchCompleted !== 'boolean') {
          console.warn('⚠️ isMatchCompleted was not boolean, forcing to false:', this.isMatchCompleted);
          this.isMatchCompleted = false;
        }
        
        console.log('Final isMatchCompleted value:', this.isMatchCompleted, '(type:', typeof this.isMatchCompleted, ')');
        
        if (this.isMatchCompleted) {
          console.log('Match is completed - disabling score entry');
          this.snackBar.open(
            `Match "${match.name}" is completed. Scores cannot be modified. Change match status to enable editing.`, 
            'Close', 
            { duration: 8000, panelClass: ['warning-snackbar'] }
          );
        } else {
          console.log('Match is not completed - score entry enabled');
        }
        
        // Update form control states based on match completion status
        this.updateFormControlStates();
        
        // Check for scorecardId - handle both string and object cases
        const scorecardId = match.scorecardId;
        let hasScorecard = false;
        
        if (typeof scorecardId === 'string' && scorecardId.trim() !== '') {
          hasScorecard = true;
          console.log('ScorecardId is a valid string:', scorecardId);
        } else if (scorecardId && typeof scorecardId === 'object' && scorecardId !== null) {
          hasScorecard = true;
          console.log('ScorecardId is a populated object:', scorecardId);
        } else {
          console.log('ScorecardId is invalid:', scorecardId, typeof scorecardId);
        }
        
        if (hasScorecard) {
          console.log('Match has valid scorecardId:', scorecardId);
          this.loadScorecardAndMembers(match);
        } else {
          console.log('Match has no valid scorecard assigned. ScorecardId:', scorecardId);
          console.log('Full match object:', JSON.stringify(match, null, 2));
          
          const action = this.snackBar.open(
            `Match "${match.name}" has no scorecard assigned. Click to edit and add a scorecard.`, 
            'Edit Match', 
            { duration: 10000 }
          );
          
          action.onAction().subscribe(() => {
            this.router.navigate(['/matches/edit', this.matchId]);
          });
          
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading match:', error);
        console.error('Match ID that failed:', this.matchId);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Error loading match data';
        if (error.status === 404) {
          errorMessage = 'Match not found';
        } else if (error.status === 401) {
          errorMessage = 'Not authorized to view this match';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server';
        }
        
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.router.navigate(['/matches']);
        this.loading = false;
      }
    });
  }

  private loadScorecardAndMembers(match: Match): void {
    // Handle both string ID and populated object cases
    let scorecardId: string;
    let scorecardData: any = null;
    
    if (typeof match.scorecardId === 'string') {
      scorecardId = match.scorecardId;
    } else if (match.scorecardId && typeof match.scorecardId === 'object') {
      // scorecardId is populated - extract the ID and use the data
      scorecardData = match.scorecardId;
      scorecardId = (match.scorecardId as any)._id || (match.scorecardId as any).id;
    } else {
      console.error('Invalid scorecardId format:', match.scorecardId);
      this.snackBar.open('Invalid scorecard data', 'Close', { duration: 3000 });
      this.loading = false;
      return;
    }
    
    // Store the scorecardId for later use
    this.scorecardId = scorecardId;
    
    console.log('Processing scorecardId:', scorecardId);
    console.log('Scorecard data from population:', scorecardData);
    
    // If we have populated data, use it directly, otherwise fetch it
    const scorecardObservable = scorecardData 
      ? of(scorecardData) 
      : this.scorecardService.getById(scorecardId);
      
    const membersObservable = match.lineUps && match.lineUps.length > 0 
      ? forkJoin(match.lineUps.map(memberId => this.memberService.getById(memberId)))
      : forkJoin([]);

    forkJoin({
      scorecard: scorecardObservable,
      members: membersObservable
    }).subscribe({
      next: ({ scorecard, members }) => {
        console.log('Loaded scorecard:', scorecard);
        console.log('Loaded members:', members);
        this.scorecard = scorecard;
        this.setupHoleColumns();
        this.setupPlayerScores(members);
        this.loadExistingScores();
      },
      error: (error) => {
        console.error('Error loading scorecard and members:', error);
        this.snackBar.open('Error loading data', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private setupHoleColumns(): void {
    if (this.scorecard?.pars) {
      // Create hole columns (1-18)
      this.holeColumns = Array.from({ length: 18 }, (_, i) => `hole${i + 1}`);
      this.displayedColumns = [
        'player', 
        'handicap', 
        ...this.holeColumns, 
        'frontNine', 
        'backNine', 
        'total', 
        'netScore'
      ];
    }
  }

  private setupPlayerScores(members: Member[]): void {
    this.playerScores = members.map(member => ({
      member,
      scores: new Array(18).fill(null),
      frontNine: 0,
      backNine: 0,
      total: 0,
      handicap: member.usgaIndex || 0,
      netScore: 0
    }));

    // Setup form array
    const playersFormArray = this.fb.array(
      this.playerScores.map(() => this.createPlayerFormGroup())
    );
    this.scoreForm.setControl('players', playersFormArray);
    
    // Update form control states based on match completion status
    this.updateFormControlStates();
  }

  private createPlayerFormGroup(): FormGroup {
    const holesArray = this.fb.array(
      Array.from({ length: 18 }, () => this.fb.control(null, [Validators.min(1), Validators.max(15)]))
    );

    return this.fb.group({
      holes: holesArray
    });
  }

  private loadExistingScores(): void {
    // Get match ID - handle both _id and id cases
    const matchId = this.match?._id || this.match?.id || this.matchId;
    
    if (!matchId) {
      console.log('No match ID available for loading scores');
      this.loading = false;
      return;
    }

    console.log('Loading existing scores for match ID:', matchId);

    this.scoreService.getScoresByMatch(matchId).pipe(
      retryWhen(errors => 
        errors.pipe(
          delay(500),
          take(2) // Retry up to 2 times for score loading
        )
      )
    ).subscribe({
      next: (response: ScoresApiResponse) => {
        console.log('Scores API response:', response);
        console.log('Response structure:', {
          success: response.success,
          count: response.count,
          scores: response.scores,
          scoresLength: response.scores?.length
        });
        
        const scores = response.scores || [];
        console.log('Found', scores.length, 'scores for match');
        
        if (scores.length === 0) {
          console.log('No existing scores found for this match');
          this.loading = false;
          return;
        }
        
        // Log all player member IDs for debugging
        console.log('Available players:', this.playerScores.map(ps => ({
          name: `${ps.member.firstName} ${ps.member.lastName || ''}`.trim(),
          id: ps.member._id,
          memberId: ps.member.id
        })));
        
        // Match existing scores with players
        scores.forEach((score: any, scoreIndex: number) => {
          console.log(`Processing score ${scoreIndex + 1}:`, {
            scoreId: score._id,
            memberId: score.memberId,
            memberIdType: typeof score.memberId,
            scoreLength: score.scores?.length,
            scores: score.scores
          });
          
          // Try to find player by memberId (handle both string and object cases)
          let memberIdToMatch = score.memberId;
          if (typeof score.memberId === 'object' && score.memberId !== null) {
            memberIdToMatch = score.memberId._id || score.memberId.id;
          }
          
          const playerIndex = this.playerScores.findIndex(
            ps => ps.member._id === memberIdToMatch || ps.member.id === memberIdToMatch
          );
          
          console.log(`Looking for member ID: ${memberIdToMatch}, found at index: ${playerIndex}`);
          
          if (playerIndex >= 0 && score.scores) {
            console.log(`Updating player ${playerIndex} with scores:`, score.scores);
            this.playerScores[playerIndex].scores = [...score.scores];
            this.playerScores[playerIndex].existingScoreId = score._id;
            
            // Update form with existing scores
            const playerFormGroup = this.getPlayerFormGroup(playerIndex);
            const holesFormArray = playerFormGroup.get('holes') as FormArray;
            score.scores.forEach((scoreValue: number, holeIndex: number) => {
              if (holeIndex < 18) {
                holesFormArray.at(holeIndex).setValue(scoreValue);
              }
            });
            
            this.calculatePlayerTotals(playerIndex);
          } else {
            console.warn(`Could not find player for score with memberId: ${memberIdToMatch}`);
          }
        });
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading existing scores:', error);
        console.error('Match ID used for score loading:', this.match?._id || this.match?.id || this.matchId);
        console.error('Error details:', {
          status: error.status,
          message: error.message,
          url: error.url
        });
        
        if (error.status === 404) {
          console.log('No scores found for this match (404)');
        } else if (error.status === 0) {
          console.error('Network error - cannot connect to server');
        }
        
        this.loading = false;
      }
    });
  }

  getPlayerFormGroup(index: number): FormGroup {
    const playersFormArray = this.scoreForm.get('players') as FormArray;
    return playersFormArray.at(index) as FormGroup;
  }

  getHolesFormArray(playerIndex: number): FormArray {
    const playerFormGroup = this.getPlayerFormGroup(playerIndex);
    return playerFormGroup.get('holes') as FormArray;
  }

  private updateFormControlStates(): void {
    console.log('Updating form control states, isMatchCompleted:', this.isMatchCompleted);
    
    const playersFormArray = this.scoreForm.get('players') as FormArray;
    
    playersFormArray.controls.forEach((playerControl, playerIndex) => {
      const holesFormArray = playerControl.get('holes') as FormArray;
      
      holesFormArray.controls.forEach((holeControl, holeIndex) => {
        if (this.isMatchCompleted) {
          holeControl.disable();
          console.log(`Disabled form control for player ${playerIndex}, hole ${holeIndex}`);
        } else {
          holeControl.enable();
          console.log(`Enabled form control for player ${playerIndex}, hole ${holeIndex}`);
        }
      });
    });
  }

  onScoreChange(playerIndex: number, holeIndex: number, event: any): void {
    console.log('🔥 onScoreChange called:', { 
      playerIndex, 
      holeIndex, 
      isMatchCompleted: this.isMatchCompleted,
      value: event.target.value,
      timestamp: new Date().toISOString()
    });
    
    // Prevent score changes if match is completed - HARD STOP
    if (this.isMatchCompleted) {
      console.log('🚫 Blocking score change - match is completed');
      event.preventDefault();
      event.target.value = this.playerScores[playerIndex]?.scores[holeIndex] || '';
      this.snackBar.open('Cannot modify scores - match is completed. Change match status to enable editing.', 'Close', { 
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    console.log('✅ Score change allowed - processing...');

    const inputValue = event.target.value.trim();
    let score: number | null = null;
    
    // Handle empty input
    if (!inputValue) {
      score = null;
    } else if (!isNaN(inputValue)) {
      const numValue = parseInt(inputValue);
      // Allow scores from 1 to 15 for golf
      if (numValue >= 1 && numValue <= 15) {
        score = numValue;
      } else {
        // Invalid score, clear the input and don't set a score
        event.target.value = '';
        score = null;
      }
    } else {
      // Non-numeric input, clear the field
      event.target.value = '';
      score = null;
    }
    
    this.playerScores[playerIndex].scores[holeIndex] = score;
    this.calculatePlayerTotals(playerIndex);
  }

  private calculatePlayerTotals(playerIndex: number): void {
    const player = this.playerScores[playerIndex];
    const scores = player.scores;

    // Calculate front nine (holes 1-9)
    player.frontNine = this.sumScores(scores.slice(0, 9));
    
    // Calculate back nine (holes 10-18)
    player.backNine = this.sumScores(scores.slice(9, 18));
    
    // Calculate total
    player.total = player.frontNine + player.backNine;
    
    // Calculate net score (total - handicap)
    player.netScore = player.total - player.handicap;
  }

  private sumScores(scores: (number | null)[]): number {
    return scores.reduce((sum: number, score: number | null) => sum + (score || 0), 0);
  }

  calculateCourseHandicap(usgaIndex: number): number {
    if (!this.scorecard?.slope) return 0;
    return Math.round((usgaIndex * this.scorecard.slope) / 113);
  }

  getParForHole(holeIndex: number): number {
    return this.scorecard?.pars?.[holeIndex] || 4;
  }

  getCoursePar(): number {
    return this.scorecard?.par || this.scorecard?.pars?.reduce((sum, par) => sum + par, 0) || 72;
  }

  getFrontNinePar(): number {
    return this.scorecard?.pars?.slice(0, 9).reduce((sum, par) => sum + par, 0) || 36;
  }

  getBackNinePar(): number {
    return this.scorecard?.pars?.slice(9, 18).reduce((sum, par) => sum + par, 0) || 36;
  }

  getHoleHandicap(playerIndex: number): number {
    // Get the player's course handicap
    const player = this.playerScores[playerIndex];
    if (!player || !player.member?.usgaIndex || !this.scorecard?.slope) {
      return 0;
    }
    
    return Math.round((player.member.usgaIndex * this.scorecard.slope) / 113);
  }

  getHoleHandicapFromScorecard(holeIndex: number): number {
    return this.scorecard?.hCaps?.[holeIndex] || 0;
  }

  onKeyDown(event: KeyboardEvent, playerIndex: number, holeIndex: number): void {
    const target = event.target as HTMLInputElement;
    
    // Only process if match is not completed
    if (this.isMatchCompleted) {
      event.preventDefault();
      return;
    }
    
    // Allow normal backspace, delete, tab, escape, enter, arrow keys
    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].includes(event.keyCode)) {
      return; // Let these keys work normally
    }
    
    // Allow digits 0-9 for scores
    if (event.keyCode >= 48 && event.keyCode <= 57) {
      // Always clear the field before entering a digit if value is 0 or single digit
      if (target.value === '0' || target.value.length === 1) {
        target.value = '';
      }
      // Let the normal typing behavior work, but limit to 2 characters via maxlength
      setTimeout(() => this.moveToNextCell(playerIndex, holeIndex), 0);
      return; // Don't preventDefault - let normal input handling work
    }
    
    // Prevent all other keys (letters, symbols, etc.)
    event.preventDefault();
  }

  private moveToNextCell(playerIndex: number, holeIndex: number): void {
    let nextPlayerIndex = playerIndex;
    let nextHoleIndex = holeIndex + 1;
    
    // If we're at the last hole, move to first hole of next player
    if (nextHoleIndex >= 18) {
      nextHoleIndex = 0;
      nextPlayerIndex = playerIndex + 1;
    }
    
    // If we're at the last player, stop
    if (nextPlayerIndex >= this.playerScores.length) {
      return;
    }
    
    // Focus the next input
    const nextInput = document.getElementById(`score-${nextPlayerIndex}-${nextHoleIndex}`);
    if (nextInput) {
      nextInput.focus();
    }
  }

  async saveScores(): Promise<void> {
    console.log('🔥 saveScores called:', {
      isMatchCompleted: this.isMatchCompleted,
      canSave: this.canSave(),
      loading: this.loading,
      saving: this.saving,
      timestamp: new Date().toISOString()
    });
    
    // ABSOLUTE PREVENTION - Multiple checks for match completion
    if (this.isMatchCompleted) {
      console.log('🚫 SAVE BLOCKED - match is completed');
      this.snackBar.open('Cannot save scores - match is completed. Change match status to enable saving.', 'Close', { 
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    // Check for any score entry containing a 0
    let hasZero = false;
    for (const playerScore of this.playerScores) {
      if (playerScore.scores.some(s => s === 0)) {
        hasZero = true;
        break;
      }
    }
    if (hasZero) {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Zero Score Detected',
        message: 'One or more scores are 0. Do you want to save anyway? (Status will be set to Needs Review)',
        confirmText: 'Save Anyway',
        cancelText: 'Cancel',
        icon: 'warning',
        color: 'warn'
      }).toPromise();
      if (!confirmed) {
        this.snackBar.open('Save cancelled. Please update scores.', 'Close', { duration: 4000, panelClass: ['warning-snackbar'] });
        return;
      }
          if (
            this.match &&
            typeof this.match._id === 'string' &&
            this.match._id &&
            this.match.status === 'open'
          ) {
            this.matchService.updateMatchStatus(this.match._id, 'needs_review').subscribe({
              next: (res) => {
                if (this.match) {
                  this.match.status = 'needs_review';
                }
                console.log('Match status updated to needs_review:', res);
              },
              error: (err) => {
                console.error('Failed to update match status:', err);
                this.snackBar.open('Failed to update match status', 'Close', { duration: 4000, panelClass: ['warning-snackbar'] });
              }
            });
          }
    }

    // Additional check - if canSave returns false, don't proceed
    if (!this.canSave()) {
      console.log('🚫 SAVE BLOCKED - canSave() returned false');
      this.snackBar.open('Cannot save at this time', 'Close', { 
        duration: 3000
      });
      return;
    }

    this.saving = true;
    
    try {
      // Save scores sequentially to avoid overwhelming the server
      for (const playerScore of this.playerScores) {
        await this.savePlayerScore(playerScore);
        // Small delay between saves to further reduce server load
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.snackBar.open('Scores saved successfully!', 'Close', { duration: 3000 });
      this.router.navigate(['/matches']);
    } catch (error) {
      this.snackBar.open('Error saving scores. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.saving = false;
    }
  }

  private async savePlayerScore(playerScore: any): Promise<void> {
    const scoreData: Partial<Score> = {
      name: `${playerScore.member.firstName} ${playerScore.member.lastName || ''}`.trim(),
      score: playerScore.total,
      postedScore: playerScore.total,
      scores: playerScore.scores.map((s: any) => s || 0),
      scoresToPost: playerScore.scores.map((s: any) => s || 0),
      usgaIndex: playerScore.member.usgaIndex,
      handicap: this.calculateCourseHandicap(playerScore.handicap),
      matchId: this.match?._id,
      memberId: playerScore.member._id,
      scorecardId: this.scorecardId,
      scSlope: this.scorecard?.slope,
      scRating: this.scorecard?.rating,
      scPars: this.scorecard?.pars,
      scHCaps: this.scorecard?.hCaps,
      scName: this.scorecard?.name,
      datePlayed: this.match?.datePlayed,
      user: this.authService.user?.id,
      isScored: true
    };

    console.log('Saving score data:', {
      scorecardId: this.scorecardId,
      matchId: this.match?._id,
      memberId: playerScore.member._id,
      fullScoreData: scoreData
    });

    try {
      if (playerScore.existingScoreId) {
        // Update existing score with retry logic
        await lastValueFrom(
          this.scoreService.update(playerScore.existingScoreId, scoreData as Score).pipe(
            retryWhen(errors => 
              errors.pipe(
                delay(500),
                take(2) // Retry up to 2 times for updates
              )
            )
          )
        );
      } else {
        // Create new score with retry logic
        await lastValueFrom(
          this.scoreService.create(scoreData as Score).pipe(
            retryWhen(errors => 
              errors.pipe(
                delay(500),
                take(2) // Retry up to 2 times for creates
              )
            )
          )
        );
      }
    } catch (error) {
      console.error(`Error saving score for ${playerScore.member.firstName}:`, error);
      throw error; // Re-throw to be caught by the calling method
    }
  }

  canSave(): boolean {
    return !this.loading && !this.saving && !this.isMatchCompleted && this.playerScores.length > 0;
  }

  editMatch(): void {
    this.router.navigate(['/matches/edit', this.matchId]);
  }

  goBack(): void {
    this.router.navigate(['/matches']);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.saveSubject.complete();
  }

  // DEBUG METHODS - Remove in production
  debugEventBinding() {
    console.log('🔍 Debug Event Binding Check');
    console.log('Component state:', {
      loading: this.loading,
      saving: this.saving,
      isMatchCompleted: this.isMatchCompleted,
      playerScores: this.playerScores?.length,
      canSave: this.canSave()
    });
    
    console.log('Methods available:', {
      onScoreChange: typeof this.onScoreChange,
      saveScores: typeof this.saveScores,
      canSave: typeof this.canSave
    });
  }

  debugOnScoreChange() {
    console.log('🔍 Testing onScoreChange manually');
    
    if (!this.playerScores || this.playerScores.length === 0) {
      console.error('❌ No player scores available');
      return;
    }
    
    const mockEvent = {
      target: { value: '4' },
      preventDefault: () => console.log('preventDefault called')
    };
    
    try {
      this.onScoreChange(0, 0, mockEvent);
      console.log('✅ onScoreChange executed');
    } catch (error) {
      console.error('❌ onScoreChange failed:', error);
    }
  }

  debugSaveScores() {
    console.log('🔍 Testing saveScores manually');
    
    try {
      this.saveScores();
      console.log('✅ saveScores executed');
    } catch (error) {
      console.error('❌ saveScores failed:', error);
    }
  }

  debugFormState() {
    console.log('🔍 Form State Debug');
    console.log('Form object:', this.scoreForm);
    console.log('Form valid:', this.scoreForm?.valid);
    console.log('Form value:', this.scoreForm?.value);
    
    const playersArray = this.scoreForm?.get('players') as FormArray;
    console.log('Players array:', {
      exists: !!playersArray,
      length: playersArray?.length,
      controls: playersArray?.controls?.length
    });
    
    if (playersArray && playersArray.length > 0) {
      console.log('First player form:', playersArray.at(0)?.value);
    }
  }

  private async performSave(): Promise<void> {
    if (!this.match || !this.scorecard) {
      this.snackBar.open('Missing match or scorecard data', 'Close', { duration: 3000 });
      return;
    }
    this.saving = true;
    try {
      // Save scores sequentially to avoid overwhelming the server
      for (const playerScore of this.playerScores) {
        await this.savePlayerScore(playerScore);
        // Small delay between saves to further reduce server load
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      this.snackBar.open('Scores saved successfully!', 'Close', { duration: 3000 });
      this.router.navigate(['/matches']);
    } catch (error) {
      this.snackBar.open('Error saving scores. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.saving = false;
    }
  }
}