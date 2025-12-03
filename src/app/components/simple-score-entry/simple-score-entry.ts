import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';

import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScoreService } from '../../services/scoreService';
import { ScorecardService, Scorecard } from '../../services/scorecardService';
import { AuthService } from '../../services/authService';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { Score } from '../../models/score';

interface SimplePlayerScore {
  member: Member;
  totalScore: number | null;
  handicap: number;
  netScore: number;
  existingScoreId?: string;
}

@Component({
  selector: 'app-simple-score-entry',
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
    MatChipsModule,
    MatTableModule
  ],
  templateUrl: './simple-score-entry.html',
  styleUrls: ['./simple-score-entry.scss']
})
export class SimpleScoreEntryComponent implements OnInit {
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
  playerScores: SimplePlayerScore[] = [];
  scoreForm!: FormGroup;
  loading = false;
  saving = false;
  isMatchCompleted = false;

  displayedColumns: string[] = ['player', 'handicap', 'totalScore', 'netScore'];

  ngOnInit(): void {
    this.matchId = this.route.snapshot.params['id'];
    this.initializeForm();
    this.loadMatchData();
  }

  private initializeForm(): void {
    this.scoreForm = this.fb.group({
      players: this.fb.array([])
    });
  }

  private loadMatchData(): void {
    this.loading = true;
    
    this.matchService.getById(this.matchId).subscribe({
      next: (response: any) => {
        const match = response?.match || response;
        
        if (!match) {
          this.snackBar.open('Match not found', 'Close', { duration: 3000 });
          this.router.navigate(['/matches']);
          this.loading = false;
          return;
        }
        
        this.match = match;
        this.isMatchCompleted = match.status === 'completed';
        
        if (this.isMatchCompleted) {
          this.snackBar.open(
            `Match "${match.name}" is completed. Scores cannot be modified.`, 
            'Close', 
            { duration: 5000 }
          );
        }
        
        // Check for scorecard
        const scorecardId = match.scorecardId;
        let hasScorecard = false;
        
        if (typeof scorecardId === 'string' && scorecardId.trim() !== '') {
          hasScorecard = true;
        } else if (scorecardId && typeof scorecardId === 'object' && scorecardId !== null) {
          hasScorecard = true;
        }
        
        if (hasScorecard) {
          this.loadScorecardAndMembers(match);
        } else {
          this.snackBar.open('Match has no scorecard assigned', 'Close', { duration: 5000 });
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading match:', error);
        this.snackBar.open('Error loading match data', 'Close', { duration: 3000 });
        this.router.navigate(['/matches']);
        this.loading = false;
      }
    });
  }

  private loadScorecardAndMembers(match: Match): void {
    let scorecardId: string;
    let scorecardData: any = null;
    
    if (typeof match.scorecardId === 'string') {
      scorecardId = match.scorecardId;
    } else if (match.scorecardId && typeof match.scorecardId === 'object') {
      scorecardData = match.scorecardId;
      scorecardId = (match.scorecardId as any)._id || (match.scorecardId as any).id;
    } else {
      this.snackBar.open('Invalid scorecard data', 'Close', { duration: 3000 });
      this.loading = false;
      return;
    }
    
    this.scorecardId = scorecardId;
    
    // Check for members
    if (!match.lineUps || match.lineUps.length === 0) {
      this.snackBar.open('Match has no members assigned', 'Close', { duration: 5000 });
      this.loading = false;
      return;
    }
    
    const scorecardObservable = scorecardData 
      ? of(scorecardData) 
      : this.scorecardService.getById(scorecardId);
      
    const membersObservable = forkJoin(
      match.lineUps.map(memberId => this.memberService.getById(memberId))
    );

    forkJoin({
      scorecard: scorecardObservable,
      members: membersObservable
    }).subscribe({
      next: ({ scorecard, members }) => {
        this.scorecard = scorecard;
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

  private setupPlayerScores(members: Member[]): void {
    this.playerScores = members.map(member => ({
      member,
      totalScore: null,
      handicap: member.usgaIndex || 0,
      netScore: 0
    }));

    const playersFormArray = this.fb.array(
      this.playerScores.map(() => this.fb.group({
        totalScore: [null, [Validators.min(this.scorecard?.par || 0), Validators.max(200)]]
      }))
    );
    this.scoreForm.setControl('players', playersFormArray);
  }

  private loadExistingScores(): void {
    const matchId = this.match?._id || this.matchId;
    
    if (!matchId) {
      this.loading = false;
      return;
    }

    this.scoreService.getScoresByMatch(matchId).subscribe({
      next: (response: any) => {
        const scores = response.scores || [];
        
        scores.forEach((score: any) => {
          let memberIdToMatch = score.memberId;
          if (typeof score.memberId === 'object' && score.memberId !== null) {
            memberIdToMatch = score.memberId._id || score.memberId.id;
          }
          
          const playerIndex = this.playerScores.findIndex(
            ps => ps.member._id === memberIdToMatch
          );
          
          if (playerIndex >= 0) {
            this.playerScores[playerIndex].totalScore = score.score || score.postedScore;
            this.playerScores[playerIndex].existingScoreId = score._id;
            
            const playerFormGroup = this.getPlayerFormGroup(playerIndex);
            playerFormGroup.get('totalScore')?.setValue(score.score || score.postedScore);
            
            this.calculateNetScore(playerIndex);
          }
        });
        this.loading = false;
      },
      error: (error: any) => {
        if (error.status !== 404) {
          console.error('Error loading scores:', error);
        }
        this.loading = false;
      }
    });
  }

  getPlayerFormGroup(index: number): FormGroup {
    const playersFormArray = this.scoreForm.get('players') as FormArray;
    return playersFormArray.at(index) as FormGroup;
  }

  onScoreChange(playerIndex: number, event: any): void {
    if (this.isMatchCompleted) {
      event.preventDefault();
      this.snackBar.open('Cannot modify scores - match is completed', 'Close', { duration: 3000 });
      return;
    }

    const inputValue = event.target.value.trim();
    let score: number | null = null;
    
    if (!inputValue || inputValue === '0') {
      score = null;
    } else if (!isNaN(inputValue)) {
      score = parseInt(inputValue);
    }
    
    this.playerScores[playerIndex].totalScore = score;
    this.calculateNetScore(playerIndex);
  }

  private calculateNetScore(playerIndex: number): void {
    const player = this.playerScores[playerIndex];
    if (player.totalScore !== null) {
      player.netScore = player.totalScore - player.handicap;
    } else {
      player.netScore = 0;
    }
  }

  async saveScores(): Promise<void> {
    if (!this.match || !this.scorecard || this.isMatchCompleted) {
      return;
    }

    this.saving = true;
    
    try {
      for (const playerScore of this.playerScores) {
        if (playerScore.totalScore !== null) {
          await this.savePlayerScore(playerScore);
        }
      }
      
      this.snackBar.open('Scores saved successfully!', 'Close', { duration: 3000 });
      this.router.navigate(['/matches']);
    } catch (error) {
      console.error('Error saving scores:', error);
      this.snackBar.open('Error saving scores. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.saving = false;
    }
  }

  private async savePlayerScore(playerScore: SimplePlayerScore): Promise<void> {
    const scoreData: Partial<Score> = {
      name: `${playerScore.member.firstName} ${playerScore.member.lastName || ''}`.trim(),
      score: playerScore.totalScore || 0,
      postedScore: playerScore.totalScore || 0,
      scores: new Array(18).fill(0), // Empty hole scores for simple mode
      scoresToPost: new Array(18).fill(0),
      usgaIndex: playerScore.member.usgaIndex,
      handicap: playerScore.handicap,
      matchId: this.match?._id,
      memberId: playerScore.member._id,
      scorecardId: this.scorecardId,
      scSlope: this.scorecard?.slope,
      scRating: this.scorecard?.rating,
      scPars: this.scorecard?.pars,
      scHCaps: this.scorecard?.hCaps,
      scName: this.scorecard?.name,
      datePlayed: this.match?.datePlayed,
      user: this.authService.user?._id,
      isScored: true
    };

    await this.scoreService.savePlayerScore(scoreData, playerScore.existingScoreId);
  }

  canSave(): boolean {
    return !this.loading && !this.saving && !this.isMatchCompleted && 
           this.playerScores.some(p => p.totalScore !== null);
  }

  getCoursePar(): number {
    return this.scorecard?.par || 72;
  }

  editMatch(): void {
    this.router.navigate(['/matches/edit', this.matchId]);
  }

  goBack(): void {
    this.router.navigate(['/matches']);
  }
}
