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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin, of } from 'rxjs';
import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScoreService } from '../../services/scoreService';
import { ScorecardService } from '../../services/scorecardService';
import { Scorecard } from '../../models/scorecard.interface';
import { AuthService } from '../../services/authService';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { Score } from '../../models/score';
import { M } from '@angular/material/ripple-loader.d-9me-KFSi';

interface SimplePlayerScore {
  member: Member;
  totalScore: number | null;
  differential: number | null;
  handicap: number;
  netScore: number;
  wonIndo: boolean;
  wonOneBall: boolean;
  wonTwoBall: boolean;
  existingScoreId?: string;
  scorecardId?: string;
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
    MatTableModule,
    MatCheckboxModule
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
  matchScorecardId: string = '';
  playerScores: SimplePlayerScore[] = [];
  scoreForm!: FormGroup;
  loading = false;
  saving = false;
  isMatchCompleted = false;
  entryMode: 'totalScore' | 'differential' = 'totalScore';
  hasScoresRecordedByHole = false;

  displayedColumns: string[] = ['player', 'handicap', 'totalScore', 'netScore','winnerStatus'];

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
        // Extract scorecardId and scorecardData
        let scorecardId: string | undefined = undefined;
        let scorecardData: any = null;
        if (typeof match.scorecardId === 'string' && match.scorecardId.trim() !== '') {
          scorecardId = match.scorecardId;
        } else if (match.scorecardId && typeof match.scorecardId === 'object' && match.scorecardId !== null) {
          scorecardData = match.scorecardId;
          scorecardId = match.scorecardId._id || match.scorecardId.id;
        }
        if (scorecardId) {
          this.loadScorecardAndMembers(match, scorecardId, scorecardData);
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

  private loadScorecardAndMembers(match: Match, scorecardId: string, scorecardData: any): void {
    this.matchScorecardId = scorecardId;
    if (!match.lineUps || match.lineUps.length === 0) {
      this.snackBar.open('Match has no members assigned', 'Close', { duration: 5000 });
      this.loading = false;
      return;
    }

    // 1. Load the match scorecard (for course name)
    const scorecardObservable = scorecardData
      ? of(scorecardData)
      : this.scorecardService.getById(scorecardId);

    // 2. Load all members in the match
    const membersObservable = forkJoin(
      match.lineUps.map(memberId => this.memberService.getById(memberId))
    );

    // 3. Load all scorecards (for member tee/rating/slope lookup)
    const allScorecardsObservable = this.scorecardService.getAll();

    forkJoin({
      scorecard: scorecardObservable,
      members: membersObservable,
      allScorecards: allScorecardsObservable
    }).subscribe({
      next: ({ scorecard, members, allScorecards }) => {
        this.scorecard = scorecard;
        const matchCourse = scorecard.course;
        // Defensive: flatten if allScorecards is wrapped
        const scorecardList: any[] = Array.isArray(allScorecards) ? allScorecards : allScorecards.scorecards || [];

        // For each member, find their scorecard for this course
        const membersWithCourseScorecard = members.map(member => {
          let memberScorecard: any = null;
          if (Array.isArray(member.scorecardsId)) {
            // Find the member's scorecard for this course
            for (const scId of member.scorecardsId) {
              const sc = scorecardList.find((s: any) => 
                (s._id === scId || s.scorecardId === scId) && s.course === matchCourse);
              console.log("SCID", scId, "MC", matchCourse);
              if (sc) {
                memberScorecard = sc;
                break;
              }
            }
          }
          console.log("this.SC", this.scorecard,"MSCIDS", member.scorecardsId,"SL", scorecardList,"MC",matchCourse,"SC",scorecard, "MS", memberScorecard,`Member ${member.firstName} ${member.lastName || ''} assigned scorecard:`, memberScorecard);
          return { ...member, memberScorecard };
        });

        // Setup player scores with member-specific tees/rating/slope
        this.playerScores = membersWithCourseScorecard.map(({ memberScorecard, ...member }) => ({
          member: member as Member,
          totalScore: null,
          differential: null,
          handicap: (member as Member).usgaIndex || 0,
          netScore: 0,
          wonIndo: false,
          wonOneBall: false,
          wonTwoBall: false,
          // Attach member's scorecard info for use in template or calculations
          scorecardId: memberScorecard?._id,
          tees: memberScorecard?.tees,
          rating: memberScorecard?.rating,
          slope: memberScorecard?.slope
        }));

        this.setupPlayerScores(members); // Optionally update this to use playerScores above
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
      differential: null,
      handicap: member.usgaIndex || 0,
      netScore: 0,
      wonIndo: false,
      wonOneBall: false,
      wonTwoBall: false
    }));

    const playersFormArray = this.fb.array(
      this.playerScores.map(() => this.fb.group({
        totalScore: [null, [Validators.min(this.scorecard?.par || 0), Validators.max(200)]],
        differential: [null, [Validators.min(-50), Validators.max(100)]]
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
        
        // Check if any scores were recorded by hole
        const byHoleScores = scores.filter((s: any) => s.scoreRecordType === 'byHole');
        if (byHoleScores.length > 0) {
          this.hasScoresRecordedByHole = true;
          const playerNames = byHoleScores
            .map((s: any) => s.name)
            .join(', ');
          this.snackBar.open(
            `Warning: ${byHoleScores.length} score(s) were recorded by hole (${playerNames}). Individual hole scores will be ignored if you save in simple mode.`,
            'OK',
            { duration: 10000 }
          );
        }
        
        scores.forEach((score: any) => {
          let memberIdToMatch = score.memberId;
          if (typeof score.memberId === 'object' && score.memberId !== null) {
            memberIdToMatch = score.memberId._id;
          }
          
          const playerIndex = this.playerScores.findIndex(
            ps => ps.member._id === memberIdToMatch
          );
          
          if (playerIndex >= 0) {
            const totalScore = score.score || score.postedScore;
            this.playerScores[playerIndex].totalScore = totalScore;
            this.playerScores[playerIndex].existingScoreId = score._id;

            // Set win booleans from backend data if present
            this.playerScores[playerIndex].wonIndo = typeof score.wonIndo === 'boolean' ? score.wonIndo : false;
            this.playerScores[playerIndex].wonOneBall = typeof score.wonOneBall === 'boolean' ? score.wonOneBall : false;
            this.playerScores[playerIndex].wonTwoBall = typeof score.wonTwoBall === 'boolean' ? score.wonTwoBall : false;

            // Calculate differential from total score (reverse calculation)
            const coursePar = this.scorecard?.par || 72;
            const courseRating = this.scorecard?.rating || coursePar;
            this.playerScores[playerIndex].differential = totalScore - courseRating;

            const playerFormGroup = this.getPlayerFormGroup(playerIndex);
            playerFormGroup.get('totalScore')?.setValue(totalScore);
            playerFormGroup.get('differential')?.setValue(this.playerScores[playerIndex].differential);

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

  onTotalScoreChange(playerIndex: number, event: any): void {
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
    
    // Update differential based on total score
    if (score !== null) {
      const courseRating = this.scorecard?.rating || this.scorecard?.par || 72;
      this.playerScores[playerIndex].differential = score - courseRating;
      const playerFormGroup = this.getPlayerFormGroup(playerIndex);
      playerFormGroup.get('differential')?.setValue(this.playerScores[playerIndex].differential, { emitEvent: false });
    } else {
      this.playerScores[playerIndex].differential = null;
    }
    
    this.calculateNetScore(playerIndex);
  }

  onDifferentialChange(playerIndex: number, event: any): void {
    if (this.isMatchCompleted) {
      event.preventDefault();
      this.snackBar.open('Cannot modify scores - match is completed', 'Close', { duration: 3000 });
      return;
    }

    const inputValue = event.target.value.trim();
    let differential: number | null = null;
    
    if (!inputValue) {
      differential = null;
    } else if (!isNaN(inputValue)) {
      differential = parseFloat(inputValue);
    }
    
    this.playerScores[playerIndex].differential = differential;
    
    // Calculate total score from differential
    if (differential !== null) {
      const courseRating = this.scorecard?.rating || this.scorecard?.par || 72;
      this.playerScores[playerIndex].totalScore = Math.round(differential + courseRating);
      const playerFormGroup = this.getPlayerFormGroup(playerIndex);
      playerFormGroup.get('totalScore')?.setValue(this.playerScores[playerIndex].totalScore, { emitEvent: false });
    } else {
      this.playerScores[playerIndex].totalScore = null;
    }
    
    this.calculateNetScore(playerIndex);
  }

  toggleEntryMode(): void {
    this.entryMode = this.entryMode === 'totalScore' ? 'differential' : 'totalScore';
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
      scoreRecordType: this.entryMode === 'differential' ? 'differential' : 'total',
      usgaIndex: playerScore.member.usgaIndex,
      handicap: playerScore.handicap,
      matchId: this.match?._id,
      memberId: playerScore.member._id,
      scorecardId: this.scorecard?._id,
      scSlope: this.scorecard?.slope,
      scRating: this.scorecard?.rating,
      scPars: this.scorecard?.pars,
      scHCaps: this.scorecard?.hCaps,
      scTees: this.scorecard?.tees,
      scCourse: this.scorecard?.course,
      datePlayed: this.match?.datePlayed,
      author: this.authService.getAuthorObject(),
      isScored: true,
      wonIndo: playerScore.wonIndo,
      wonOneBall: playerScore.wonOneBall,
      wonTwoBall: playerScore.wonTwoBall  
    };

    await this.scoreService.savePlayerScore(scoreData, playerScore.existingScoreId);
  }

  canSave(): boolean {
    return !this.loading && !this.saving && !this.isMatchCompleted && 
           this.playerScores.some(p => p.totalScore !== null);
  }

  getCourse():string {
    return this.scorecard?.course || " "
  }

  // getCourseRating(): number {
  //   return this.scorecard?.rating || this.getCoursePar();
  // }

  editMatch(): void {
    this.router.navigate(['/matches/edit', this.matchId]);
  }

  goBack(): void {
    this.router.navigate(['/matches']);
  }
}
