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
import { forkJoin, of, Subject } from 'rxjs';
import {  debounceTime, distinctUntilChanged, switchMap, delay, take } from 'rxjs/operators';


interface ScoresApiResponse {
  success: boolean;
  count: number;
  scores: Score[];
}

import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScoreService } from '../../services/scoreService';
import { ScorecardService } from '../../services/scorecardService';
import { Scorecard } from '../../models/scorecard.interface';
import { AuthService } from '../../services/authService';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { Score } from '../../models/score';
import type { PlayerScore } from '../../models/player-score.interface';
import {
  sumScores,
  calculateCourseHandicap,
  getParForHole,
  getCoursePar,
  getFrontNinePar,
  getBackNinePar,
  calculatePlayerTotals
} from '../../utils/score-utils';


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
  getParForHole(holeIndex: number): number {
    // Returns the par for a specific hole
    return getParForHole(this.scorecard?.pars, holeIndex);
  }

  getBackNinePar(): number {
    // Returns the sum of pars for holes 10-18
    if (this.scorecard?.pars && Array.isArray(this.scorecard.pars)) {
      return getBackNinePar(this.scorecard.pars);
    }
    return 0;
  }

  getHoleHandicapFromScorecard(holeIndex: number): number {
    // Returns the handicap for a specific hole from scorecard
    return this.scorecard?.hCaps?.[holeIndex] || 0;
  }

  getHoleHandicap(playerIndex: number): number {
    // Returns the handicap for a player
    return this.playerScores[playerIndex]?.handicap || 0;
  }

  onKeyDown(event: KeyboardEvent, playerIndex: number, holeIndex: number): void {
    // Prevent input if match is completed
    if (this.isMatchCompleted) {
      event.preventDefault();
      this.snackBar.open('Cannot modify scores - match is completed.', 'Close', { duration: 3000 });
    }
  }

  saveScores(): void {
    // Triggers debounced save
    if (this.canSave()) {
      this.saveSubject.next();
    } else {
      this.snackBar.open('Cannot save scores. Please check all fields.', 'Close', { duration: 3000 });
    }
  }
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
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
  private playerSaveSubjects: Map<number, Subject<void>> = new Map();
  playerSaveStatus: Map<number, 'saved' | 'saving' | 'unsaved' | 'error'> = new Map();
  lastSaveTime: Map<number, Date> = new Map();

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

  private setupPlayerAutoSave(playerIndex: number): void {
    const subject = new Subject<void>();
    this.playerSaveSubjects.set(playerIndex, subject);
    
    subject.pipe(
      debounceTime(2000), // Wait 2 seconds after last input
      switchMap(() => this.autoSavePlayer(playerIndex))
    ).subscribe({
      error: (error) => {
        console.error(`Auto-save error for player ${playerIndex}:`, error);
        this.playerSaveStatus.set(playerIndex, 'error');
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
      (errors => 
        errors.pipe(
          delay(1000),
          take(3) // Retry up to 3 times with 1 second delay
        )
      )
    ).subscribe({
      next: (response: any) => {
        // console.log('Raw match service response:', response);
        
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
    
    // Check if match has members assigned
    if (!match.lineUps || match.lineUps.length === 0) {
      console.log('Match has no members assigned');
      this.snackBar.open(
        `Match "${match.name}" has no members assigned. Please edit the match and add members before entering scores.`, 
        'Close', 
        { duration: 8000, panelClass: ['warning-snackbar'] }
      );
      this.loading = false;
      return;
    }
    
    // If we have populated data, use it directly, otherwise fetch it
    const scorecardObservable = scorecardData 
      ? of(scorecardData) 
      : this.scorecardService.getById(scorecardId);
      
    const membersObservable = forkJoin(match.lineUps.map(memberId => this.memberService.getById(memberId)));

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
    
    // Setup auto-save for each player
    this.playerScores.forEach((_, index) => {
      this.setupPlayerAutoSave(index);
      this.playerSaveStatus.set(index, 'unsaved');
    });
    
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
    const matchId = this.match?._id || this.matchId;
    
    if (!matchId) {
      console.log('No match ID available for loading scores');
      this.loading = false;
      return;
    }

    console.log('Loading existing scores for match ID:', matchId);

    this.scoreService.getScoresByMatch(matchId).pipe(
      (errors => 
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
          memberId: ps.member._id
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
            memberIdToMatch = score.memberId._id;
          }
          
          const playerIndex = this.playerScores.findIndex(
            ps => ps.member._id === memberIdToMatch || ps.member._id === memberIdToMatch
          );
          
          console.log(`Looking for member ID: ${memberIdToMatch}, found at index: ${playerIndex}`);
          
          if (playerIndex >= 0 && score.scores) {
            console.log(`Updating player ${playerIndex} with scores:`, score.scores);
            this.playerScores[playerIndex].scores = [...score.scores];
            // Prefer `_id` but fall back to `id` if backend returns a different property name
            this.playerScores[playerIndex].existingScoreId = score._id || (score.id as string) || undefined;
            
            // Update form with existing scores
            const playerFormGroup = this.getPlayerFormGroup(playerIndex);
            const holesFormArray = playerFormGroup.get('holes') as FormArray;
            score.scores.forEach((scoreValue: number, holeIndex: number) => {
              if (holeIndex < 18) {
                holesFormArray.at(holeIndex).setValue(scoreValue);
              }
            });
            
            this.calculatePlayerTotals(playerIndex);
            
            // Mark player as saved since scores were loaded from backend
            this.playerSaveStatus.set(playerIndex, 'saved');
            this.lastSaveTime.set(playerIndex, new Date());
          } else {
            console.warn(`Could not find player for score with memberId: ${memberIdToMatch}`);
          }
        });
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading existing scores:', error);
        console.error('Match ID used for score loading:', this.match?._id || this.matchId);
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
    
    // Handle empty input or zero
    if (!inputValue || inputValue === '0') {
      score = null;
      event.target.value = '';
    } else if (!isNaN(inputValue)) {
      const numValue = parseInt(inputValue);
      // Allow scores from 1 to 15 for golf (zero is not valid)
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
    
    // Mark as unsaved and trigger auto-save
    this.playerSaveStatus.set(playerIndex, 'unsaved');
    const saveSubject = this.playerSaveSubjects.get(playerIndex);
    if (saveSubject) {
      saveSubject.next();
    }

    // Auto-advance to next input if a valid digit (1-9) is entered
    if (score !== null && event && event.target && event.target.value.length === 1) {
      const nextHoleIndex = holeIndex + 1;
      // Only advance if next hole exists (0-17)
      if (nextHoleIndex < 18) {
        const nextInputId = `score-${playerIndex}-${nextHoleIndex}`;
        const nextInput = document.getElementById(nextInputId);
        if (nextInput) {
          (nextInput as HTMLElement).focus();
        }
      }
    }
  }

  // Highlight and replace value on entry
  onInputFocus(event: any): void {
    if (event && event.target) {
      setTimeout(() => {
        event.target.select();
      }, 0);
    }
  }

  private calculatePlayerTotals(playerIndex: number): void {
    const player = this.playerScores[playerIndex];
    const scores = player.scores;
    const { frontNine, backNine, total, netScore } = calculatePlayerTotals(scores, player.handicap);
    player.frontNine = frontNine;
    player.backNine = backNine;
    player.total = total;
    player.netScore = netScore;
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
    this.playerSaveSubjects.forEach(subject => subject.complete());
    this.playerSaveSubjects.clear();
  }

  private async autoSavePlayer(playerIndex: number): Promise<void> {
    if (!this.match || !this.scorecard || this.isMatchCompleted) {
      return;
    }

    const playerScore = this.playerScores[playerIndex];
    if (!playerScore) {
      return;
    }

    this.playerSaveStatus.set(playerIndex, 'saving');
    
    try {
      await this.savePlayerScore(playerScore);
      this.playerSaveStatus.set(playerIndex, 'saved');
      this.lastSaveTime.set(playerIndex, new Date());
      console.log(`✅ Auto-saved player ${playerIndex} at`, new Date().toLocaleTimeString());
    } catch (error) {
      console.error(`❌ Auto-save failed for player ${playerIndex}:`, error);
      this.playerSaveStatus.set(playerIndex, 'error');
      this.snackBar.open(`Failed to save scores for ${playerScore.member.firstName}. Will retry on manual save.`, 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
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
      for (let i = 0; i < this.playerScores.length; i++) {
        this.playerSaveStatus.set(i, 'saving');
        await this.savePlayerScore(this.playerScores[i]);
        this.playerSaveStatus.set(i, 'saved');
        this.lastSaveTime.set(i, new Date());
        // Small delay between saves to further reduce server load
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      this.snackBar.open('All scores saved successfully!', 'Close', { duration: 3000 });
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
      scoreRecordType: 'byHole',
      usgaIndex: playerScore.member.usgaIndex,
      handicap: calculateCourseHandicap(playerScore.handicap, this.scorecard?.slope),
      matchId: this.match?._id,
      memberId: playerScore.member._id,
      scorecardId: this.scorecardId,
      scSlope: this.scorecard?.slope,
      scRating: this.scorecard?.rating,
      scPars: this.scorecard?.pars,
      scHCaps: this.scorecard?.hCaps,
      scName: this.scorecard?.name,
      datePlayed: this.match?.datePlayed,
      author: this.authService.getAuthorObject(),
      isScored: true
    };

    try {
      await this.scoreService.savePlayerScore(scoreData, playerScore.existingScoreId);
    } catch (error) {
      console.error(`Error saving score for ${playerScore.member.firstName}:`, error);
      throw error;
    }
  }

  canSave(): boolean {
    return !this.loading && !this.saving && !this.isMatchCompleted && this.playerScores.length > 0;
  }

  getCoursePar(): number {
    return getCoursePar(this.scorecard?.par, this.scorecard?.pars);
  }

  getPlayerSaveStatus(playerIndex: number): string {
    const status = this.playerSaveStatus.get(playerIndex);
    const lastSave = this.lastSaveTime.get(playerIndex);
    
    switch (status) {
      case 'saved':
        if (lastSave) {
          const timeAgo = Math.floor((Date.now() - lastSave.getTime()) / 1000);
          if (timeAgo < 60) {
            return `Saved ${timeAgo}s ago`;
          } else {
            return `Saved ${Math.floor(timeAgo / 60)}m ago`;
          }
        }
        return 'Saved';
      case 'saving':
        return 'Saving...';
      case 'error':
        return 'Save failed';
      case 'unsaved':
      default:
        return 'Unsaved';
    }
  }

  getPlayerSaveIcon(playerIndex: number): string {
    const status = this.playerSaveStatus.get(playerIndex);
    switch (status) {
      case 'saved':
        return 'cloud_done';
      case 'saving':
        return 'cloud_upload';
      case 'error':
        return 'cloud_off';
      case 'unsaved':
      default:
        return 'cloud_queue';
    }
  }

  getPlayerSaveColor(playerIndex: number): string {
    const status = this.playerSaveStatus.get(playerIndex);
    switch (status) {
      case 'saved':
        return 'success';
      case 'saving':
        return 'primary';
      case 'error':
        return 'warn';
      case 'unsaved':
      default:
        return 'accent';
    }
  }
    getFrontNinePar(): number {
      // Returns the sum of pars for holes 1-9
      if (this.scorecard?.pars && Array.isArray(this.scorecard.pars)) {
        return getFrontNinePar(this.scorecard.pars);
      }
      return 0;
    }
}