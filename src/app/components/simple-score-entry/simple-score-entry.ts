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
import { forkJoin, Observable, of } from 'rxjs';
import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScoreService } from '../../services/scoreService';
import { ScorecardService } from '../../services/scorecardService';
import { Scorecard } from '../../models/scorecard.interface';
import { SimplePlayerScore } from '../../models/score';
import { AuthService } from '../../services/authService';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { Score } from '../../models/score';
import { getMemberScorecard, getMatchScorecard } from '../../utils/score-entry-utils';
import { calculateUSGADifferentialToday } from '../../utils/score-utils';
import { buildScoreData } from '../../utils/score-data-builder';

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
    MatCheckboxModule,
  ],
  templateUrl: './simple-score-entry.html',
  styleUrls: ['./simple-score-entry.scss'],
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
  displayedColumns: string[] = ['player', 'handicap', 'totalScore', 'netScore', 'winnerStatus'];

  ngOnInit(): void {
    this.matchId = this.route.snapshot.params['id'];
    this.initializeForm();
    this.loadMatchData();
  }

  private initializeForm(): void {
    this.scoreForm = this.fb.group({
      players: this.fb.array([]),
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
            { duration: 5000 },
          );
        }

        // Extract scorecardId and scorecardData
        let scorecardId: string | undefined = undefined;
        let scorecardData: Scorecard | null = null;
        if (typeof match.scorecardId === 'string' && match.scorecardId.trim() !== '') {
          scorecardId = match.scorecardId;
        } else if (
          match.scorecardId &&
          typeof match.scorecardId === 'object' &&
          match.scorecardId !== null
        ) {
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
      },
    });
  }

  private loadScorecardAndMembers(match: Match, scorecardId: string, scorecardData: any): void {
    this.matchScorecardId = scorecardId;
    if (!match.lineUps || match.lineUps.length === 0) {
      this.snackBar.open('Match has no members assigned', 'Close', { duration: 5000 });
      this.loading = false;
      return;
    }

    // 1. Load the match scorecard (for course)
    const scorecardObservable1 = this.scorecardService.getById(scorecardId);

    // 2. Load all members in the match
    const membersObservable = forkJoin(
      match.lineUps.map((memberId) => this.memberService.getById(memberId)),
    );

    // 3. Load all scorecards (for member tee/rating/slope lookup)
    const allScorecardsObservable = this.scorecardService.getAll();

    forkJoin({
      scorecard: scorecardObservable1,
      members: membersObservable,
      allScorecards: allScorecardsObservable,
    }).subscribe({
      next: ({ scorecard, members, allScorecards }) => {
        // Defensive: flatten if allScorecards is wrapped
        const scorecardList: any[] = Array.isArray(allScorecards)
          ? allScorecards
          : allScorecards.scorecards || [];
        // Get the actual scorecard for this match
        console.log('MatchId:', match, 'Scorecard list:', scorecardList);
        this.scorecard = getMatchScorecard(match, scorecardList);
        const matchCourse = this.scorecard?.course;
        console.log('matchCourse after assignment:', match, this.scorecard, matchCourse);

        // For each member, find their scorecard for this course
        const membersWithCourseScorecard = members.map((member) => {
          const memberScorecard: Scorecard | null = getMemberScorecard(
            matchCourse ?? '',
            member.scorecardsId ?? [],scorecardList);
          console.log('Member:', member, 'Member Scorecard:', memberScorecard);
          return { ...member, memberScorecard };
        });

        // Setup player scores with member-specific tees/rating/slope
        this.playerScores = membersWithCourseScorecard.map(({ memberScorecard, ...member }) => ({
          member: member as Member,
          totalScore: null,
          scores: [],  //Added to get score-entry working with by-hole scores in simple mode
          differential: null,
          usgaDifferentialToday: 0,
          rochDifferentialToday: 0,
          othersDifferentialToday: 0,
          handicap: (member as Member).usgaIndex || 0,
          netScore: 0,
          wonIndo: false,
          wonOneBall: false,
          wonTwoBall: false,
          // Attach member's scorecard info for use in template or calculations
          scorecardId: memberScorecard?._id,
          tees: memberScorecard?.tees,
          teeAbreviation: memberScorecard?.teeAbreviation,
          rating: memberScorecard?.rating,
          slope: memberScorecard?.slope,
          par: memberScorecard?.par
        }));
        console.log('Player Scores after setup:', this.playerScores);

        // Setup form controls for player scores
        const playersFormArray = this.fb.array(
          this.playerScores.map(() =>
            this.fb.group({
              totalScore: [null, [Validators.min(this.scorecard?.par || 0), Validators.max(200)]],
              differential: [null, [Validators.min(-50), Validators.max(100)]],
            }),
          ),
        );
        this.scoreForm.setControl('players', playersFormArray);

        this.loadExistingScores();
      },
      error: (error) => {
        console.error('Error loading scorecard and members:', error);
        this.snackBar.open('Error loading data', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });

    const playersFormArray = this.fb.array(
      this.playerScores.map(() =>
        this.fb.group({
          totalScore: [null, [Validators.min(this.scorecard?.par || 0), Validators.max(200)]],
          differential: [null, [Validators.min(-50), Validators.max(100)]],
        }),
      ),
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
          const playerNames = byHoleScores.map((s: any) => s.name).join(', ');
          this.snackBar.open(
            `Warning: ${byHoleScores.length} score(s) were recorded by hole (${playerNames}). Individual hole scores will be ignored if you save in simple mode.`,
            'OK',
            { duration: 10000 },
          );
        }

        scores.forEach((score: any) => {
          let memberIdToMatch = score.memberId;
          if (typeof score.memberId === 'object' && score.memberId !== null) {
            memberIdToMatch = score.memberId._id;
          }

          const playerIndex = this.playerScores.findIndex(
            (ps) => ps.member._id === memberIdToMatch,
          );

          if (playerIndex >= 0) {
            const totalScore = score.score || score.postedScore;
            this.playerScores[playerIndex].totalScore = totalScore;
            this.playerScores[playerIndex].existingScoreId = score._id;

            // Set win booleans from backend data if present
            this.playerScores[playerIndex].wonIndo =
              typeof score.wonIndo === 'boolean' ? score.wonIndo : false;
            this.playerScores[playerIndex].wonOneBall =
              typeof score.wonOneBall === 'boolean' ? score.wonOneBall : false;
            this.playerScores[playerIndex].wonTwoBall =
              typeof score.wonTwoBall === 'boolean' ? score.wonTwoBall : false;

            // Calculate differential from total score (reverse calculation)
            const coursePar = this.scorecard?.par || 72;
            const courseRating = this.playerScores[playerIndex].rating || coursePar;
            const courseSlope = this.playerScores[playerIndex].slope || 113;
            this.playerScores[playerIndex].differential = totalScore - courseRating;
            this.playerScores[playerIndex].usgaDifferentialToday = 
             calculateUSGADifferentialToday(totalScore,courseSlope,courseRating) ;
             this.playerScores[playerIndex].rochDifferentialToday = 
             calculateUSGADifferentialToday(totalScore,courseSlope,courseRating) ;

            const playerFormGroup = this.getPlayerFormGroup(playerIndex);
            playerFormGroup.get('totalScore')?.setValue(totalScore);
            playerFormGroup
              .get('differential')
              ?.setValue(this.playerScores[playerIndex].differential);

            this.calculateNetScore(playerIndex);
          }
          console.log(
            'Loaded existing score for player index',
            playerIndex,
            ':',
            this.playerScores[playerIndex],
          );
        });
        this.loading = false;
      },
      error: (error: any) => {
        if (error.status !== 404) {
          console.error('Error loading scores:', error);
        }
        this.loading = false;
      },
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
    this.playerScores[playerIndex].usgaDifferentialToday = calculateUSGADifferentialToday(score || 0, this.playerScores[playerIndex].slope || 113, this.playerScores[playerIndex].rating || 72) || 0;
    this.playerScores[playerIndex].rochDifferentialToday = calculateUSGADifferentialToday(score || 0, this.playerScores[playerIndex].slope || 113, this.playerScores[playerIndex].rating || 72) || 0;
    // Update differential based on total score
    if (score !== null) {
      // const courseRating = this.scorecard?.rating || this.scorecard?.par || 72;
      this.playerScores[playerIndex].differential = score - this.playerScores[playerIndex].rating!;
      const playerFormGroup = this.getPlayerFormGroup(playerIndex);
      playerFormGroup
        .get('differential')
        ?.setValue(this.playerScores[playerIndex].differential, { emitEvent: false });
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
      playerFormGroup
        .get('totalScore')
        ?.setValue(this.playerScores[playerIndex].totalScore, { emitEvent: false });
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
        console.log('Saving score for player:', playerScore.member.firstName, playerScore.member.lastName, 'Score:', playerScore);
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
    const scoreData = buildScoreData(
      playerScore,
      this.match!,
      this.scorecard!,
      this.entryMode,
      this.authService.getAuthorObject()
    );
    await this.scoreService.savePlayerScore(scoreData, playerScore.existingScoreId);
  }

  canSave(): boolean {
    return (
      !this.loading &&
      !this.saving &&
      !this.isMatchCompleted &&
      this.playerScores.some((p) => p.totalScore !== null)
    );
  }

  getCourse(): string {
    return this.scorecard?.course || ' ';
  }

  editMatch(): void {
    this.router.navigate(['/matches/edit', this.matchId]);
  }

  goBack(): void {
    this.router.navigate(['/matches']);
  }
}
