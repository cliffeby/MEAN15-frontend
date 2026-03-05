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
import { calculateDifferential } from '../../utils/score-utils';
import { buildScoreData } from '../../utils/score-data-builder';
import { HandicapCalculationService } from '../../services/handicap-calculation.service';


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
  private handicapCalculationService = inject(HandicapCalculationService);

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
  displayedColumns: string[] = ['player', 'rochIndex', 'totalScore', 'netScore', 'winnerStatus'];

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
            member.scorecardsId ?? [],
            scorecardList,
          );
          console.log('Member:', member, 'Member Scorecard:', memberScorecard);
          return { ...member, memberScorecard };
        });

        // Setup player scores with member-specific tees/rating/slope
        this.playerScores = membersWithCourseScorecard.map(({ memberScorecard, ...member }) => ({
          member, // Adding the missing `member` property
          totalScore: null,
          scores: [], //Added to get score-entry working with by-hole scores in simple mode
          differentialForRound: 0, // Default value
          scCourseHandicap: memberScorecard?.par || 0, // Updated to use `par`
          scTees: memberScorecard?.tees || '',
          teeAbreviation: memberScorecard?.teeAbreviation || '',
          scPar: memberScorecard?.par || 0,
          scSlope: memberScorecard?.slope || 0,
          scRating: memberScorecard?.rating || 0,
          usgaIndexB4Round: member.usgaIndexB4Round || 0, // Derived from `member`
          rochIndexB4Round: member.rochIndexB4Round || 0, // Derived from `member`
          frontNine: 0, // Default value
          backNine: 0, // Default value
          total: 0, // Default value
          netScore: 0, // Default value
          wonIndo: false, // Default value
          wonOneBall: false, // Default value
          wonTwoBall: false // Default value
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
            // Set existingScoreId so future saves update, not create
            this.playerScores[playerIndex].existingScoreId = score._id || score.id;

            const totalScore = score.score || score.postedScore || 0; // Ensure totalScore is defined
            const coursePar = this.scorecard?.par || 72; // Ensure coursePar is defined
            const scPar = this.scorecard?.par || 72; // Ensure coursePar is defined
            const differentialForRound = this.playerScores[playerIndex].differentialForRound = totalScore - coursePar || 0; // Ensure differentialForRound is defined
            const scRating = this.playerScores[playerIndex].scRating || coursePar; // Ensure scRating is defined
            const scSlope = this.playerScores[playerIndex].scSlope || 113; // Ensure scSlope is defined
            const courseAdjustedDifferentialForRound = calculateDifferential(this.playerScores[playerIndex].differentialForRound || 0, scSlope) || 0; // Ensure courseAdjustedDifferentialForRound is defined

            const playerFormGroup = this.getPlayerFormGroup(playerIndex);
            playerFormGroup.get('totalScore')?.setValue(totalScore);
            playerFormGroup
              .get('differential')
              ?.setValue(this.playerScores[playerIndex].differentialForRound);

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
    this.playerScores[playerIndex].differentialForRound =
      calculateDifferential(
        score || 0,
        this.playerScores[playerIndex].scSlope || 113,
        this.playerScores[playerIndex].scRating || 72,
      ) || 0; // Ensure a valid number is assigned

    // Update differential based on total score
    if (score !== null) {
      this.playerScores[playerIndex].differentialForRound =
        (score - this.playerScores[playerIndex].scRating!) || 0; // Ensure a valid number is assigned
      const playerFormGroup = this.getPlayerFormGroup(playerIndex);
      playerFormGroup
        .get('differential')
        ?.setValue(this.playerScores[playerIndex].differentialForRound, { emitEvent: false });
    } else {
      this.playerScores[playerIndex].differentialForRound = 0; // Assigning a valid default value
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
    let differential: number | undefined;
    if (!inputValue) {
      differential = undefined;
    } else if (!isNaN(inputValue)) {
      differential = parseFloat(inputValue);
    }
    this.playerScores[playerIndex].differentialForRound = differential || 0; // Ensure a valid number is assigned

    // Calculate total score from differential
    if (differential !== undefined) {
      const scRating = this.scorecard?.rating || this.scorecard?.par || 72;
      this.playerScores[playerIndex].totalScore = Math.round(differential + scRating);
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

  public calculateCourseHandicap(index: number, slope: number | undefined): number {
    if (!index || !slope) {
      return 0;
    }
    return Math.round((index * slope) / 113);
  }

  private calculateNetScore(playerIndex: number): void {
    const player = this.playerScores[playerIndex];
    if (player.totalScore !== null) {
      const rochCap = this.calculateCourseHandicap(player.rochIndexB4Round, player.scSlope);
      player.netScore = player.totalScore - rochCap;
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
        console.log(
          'Saving score for player:',
          playerScore.member.firstName,
          playerScore.member.lastName,
          'Score:',
          playerScore,
        );
        if (playerScore.totalScore !== null) {
          await this.savePlayerScore(playerScore);
        }
      }

      this.snackBar.open('Scores saved successfully!', 'Close', { duration: 3000 });
      const returnParams = { ...this.route.snapshot.queryParams, scrollToMatch: this.matchId };
      this.router.navigate(['/matches'], { queryParams: returnParams });
    } catch (error) {
      console.error('Error saving scores:', error);
      this.snackBar.open('Error saving scores. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.saving = false;
    }
  }

  private async savePlayerScore(playerScore: SimplePlayerScore): Promise<void> {
    // TODO: Get scPars for this player from their scorecard info
    console.log(
      'Saving score data for player:',
      playerScore.rochIndexB4Round,
      playerScore.usgaIndexB4Round,
      this.handicapCalculationService.calculateCourseHandicapFromIndex(playerScore.member.rochIndexB4Round || 0, 
        playerScore.scSlope || 113, playerScore.scRating || 72, playerScore.scRating || 72),
      this.handicapCalculationService.calculateCourseHandicapFromIndex(playerScore.member.usgaIndexB4Round || 0, 
        playerScore.scSlope || 113, playerScore.scRating || 72, playerScore.scRating || 72),
      playerScore,
    );
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
    // Restore pagination state from query params
    const queryParams = this.route.snapshot.queryParams;
    this.router.navigate(['/matches'], { queryParams });
  }
}
