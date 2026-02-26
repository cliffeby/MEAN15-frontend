import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, forkJoin, lastValueFrom } from 'rxjs';
import { takeUntil, map, take } from 'rxjs/operators';
import { ScoreService } from '../../services/scoreService';
import { HCapService } from '../../services/hcapService';
import { Match } from '../../models/match';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ConfigurationService } from '../../services/configuration.service';
import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScorecardPdfService } from '../../services/scorecard-pdf.service';
import { HandicapCalculationService } from '../../services/handicap-calculation.service';
import { HandicapService } from '../../services/handicapService';
import { PrintablePlayer } from '../../models/printable-player.interface';
import { MatchData, ScorecardData } from '../../models/scorecard.interface';
import { ScorecardService } from '../../services/scorecardService';
import { Scorecard } from '../../models/scorecard.interface';
import * as MatchActions from '../../store/actions/match.actions';
import { parseStringData } from '../../utils/string-utils';
import { getMemberScorecard } from '../../utils/score-entry-utils';

import {
  selectAllMatches,
  selectMatchesLoading,
  selectMatchesError,
  selectMatchStats,
  selectMatchById,
} from '../../store/selectors/match.selectors';

@Component({
  selector: 'app-match-list',
  templateUrl: './match-list.html',
  styleUrls: ['./match-list.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
  ],
})
export class MatchListComponent implements OnInit, OnDestroy {

  // Removed auto-refresh subscription
  matches$: Observable<Match[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;
  stats$: Observable<any>;

  // Pagination
  paginatedMatches$: Observable<Match[]>;
  totalMatches$: Observable<number>;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  showFirstLastButtons = true;
  showPageSizeOptions = true;

  private unsubscribe$ = new Subject<void>();
  // private currentScorecard: Scorecard | null = null;

  private snackBar = inject(MatSnackBar);
  private matchService = inject(MatchService);
  private memberService = inject(MemberService);
  private scorecardService = inject(ScorecardService);
  private pdfService = inject(ScorecardPdfService);
  private handicapService = inject(HandicapCalculationService);
  private hcapComputeService = inject(HandicapService);
  private configService = inject(ConfigurationService);
  private scoreService = inject(ScoreService);
  private hcapService = inject(HCapService);

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService,
    private route: ActivatedRoute,
  ) {
    this.matches$ = this.store.select(selectAllMatches);
    this.loading$ = this.store.select(selectMatchesLoading);
    this.error$ = this.store.select(selectMatchesError);
    this.stats$ = this.store.select(selectMatchStats);

    // Setup basic observables
    this.totalMatches$ = this.matches$.pipe(map((matches) => matches.length));
    this.paginatedMatches$ = this.matches$; // Will be updated in ngOnInit

    // Initialize defaults from configuration service
    console.log('Before applying config, pageSize:', this.pageSize);
    this.configService.config$.pipe(take(1)).subscribe((cfg) => {
      console.log('Loaded config:', cfg.pagination);
      this.pageSizeOptions = cfg?.pagination?.pageSizeOptions || [5, 10, 20, 50];
      this.pageSize = cfg?.pagination?.defaultPageSize || this.pageSizeOptions[0];
      console.log('After applying config, pageSize:', this.pageSize);

      // Force pagination setup after initializing defaults
      this.setupPagination();
    });
  }

  get isAuthorized(): boolean {
    return this.authService.hasMinRole('fieldhand');
  }
  get isAuthorizedToDelete(): boolean {
    return this.authService.hasMinRole('admin');
  }

  ngOnInit() {
    // Read pagination state from query params
    this.route.queryParams.subscribe((params: { [key: string]: any }) => {
      if (params['pageIndex']) {
        this.pageIndex = parseInt(params['pageIndex'], 10);
      }
      if (params['pageSize']) {
        this.pageSize = parseInt(params['pageSize'], 10);
      }

      // Only call setupPagination if query params explicitly update pagination
      if (params['pageIndex'] || params['pageSize']) {
        this.setupPagination();
      }

      // Scroll to match list after navigation (restores scroll position)
      setTimeout(() => {
        const el = document.querySelector('.match-list');
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 0);
    });
    // Dispatch action to load matches
    this.store.dispatch(MatchActions.loadMatches());
  }

  private setupPagination(): void {
    console.log('Setting up pagination with pageSize:', this.pageSize, 'and pageIndex:', this.pageIndex);

    // Setup paginated matches observable
    this.paginatedMatches$ = this.matches$.pipe(
      map((matches) => {
        const startIndex = this.pageIndex * this.pageSize;
        const paginated = matches.slice(startIndex, startIndex + this.pageSize);
        console.log('Paginated matches:', paginated);
        return paginated;
      }),
    );

    // Subscribe to configuration changes so pageSize and paginator options update dynamically
    this.configService.config$.pipe(takeUntil(this.unsubscribe$)).subscribe((cfg) => {
      const newPageSizeOptions = cfg?.pagination?.pageSizeOptions;
      const newShowFirstLast = cfg?.pagination?.showFirstLastButtons;
      const newShowPageSizeOptions = cfg?.pagination?.showPageSizeOptions;

      if (
        Array.isArray(newPageSizeOptions) &&
        JSON.stringify(newPageSizeOptions) !== JSON.stringify(this.pageSizeOptions)
      ) {
        this.pageSizeOptions = newPageSizeOptions;
      }

      if (typeof newShowFirstLast === 'boolean') {
        this.showFirstLastButtons = newShowFirstLast;
      }
      if (typeof newShowPageSizeOptions === 'boolean') {
        this.showPageSizeOptions = newShowPageSizeOptions;
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  editMatch(id: string) {
    if (!this.isAuthorized) {
      // Could add snackbar notification here if needed
      return;
    }
    // Pass current pagination state as query params
    this.router.navigate(['/matches/edit', id], {
      queryParams: {
        pageIndex: this.pageIndex,
        pageSize: this.pageSize
      }
    });
  }
  onPageChange(event: PageEvent) {
    console.log('Paginator event:', event);
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;

    // Update query params to reflect new pagination state
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        pageIndex: this.pageIndex,
        pageSize: this.pageSize
      },
      queryParamsHandling: 'merge',
    });

    // Reapply pagination
    this.setupPagination();
  }

  enterScores(id: string) {
    if (!id) return;
    if (!this.isAuthorized) {
      // Could add snackbar notification here if needed
      return;
    }

    // Check configuration for score entry mode
    const scoringConfig = this.configService.scoringConfig();
    const route =
      scoringConfig.scoreEntryMode === 'simple'
        ? ['/matches', id, 'simple-score-entry']
        : ['/matches', id, 'score-entry'];

    // Pass pagination state as query params
    this.router.navigate(route, {
      queryParams: {
        pageIndex: this.pageIndex,
        pageSize: this.pageSize
      }
    });
  }

  async printScorecard(id: string) {
    if (!id) return;

    this.snackBar.open('Generating scorecard...', 'Close', { duration: 2000 });

    try {
      // Load match data
      const matchResponse = await lastValueFrom(this.matchService.getById(id));
      const match = matchResponse?.match || matchResponse;

      if (!match) {
        this.snackBar.open('Match not found', 'Close', { duration: 3000 });
        return;
      }

      // Check for scorecard
      const scorecardId = match.scorecardId;
      if (!scorecardId || (typeof scorecardId === 'string' && scorecardId.trim() === '')) {
        this.snackBar.open('No scorecard assigned to this match', 'Close', { duration: 3000 });
        return;
      }

      const finalScorecardId =
        typeof scorecardId === 'string' ? scorecardId.trim() : scorecardId._id;

      // Load scorecard and members in parallel
      const { scorecard, members, allScorecards } =
        (await lastValueFrom(
          forkJoin({
            scorecard: this.scorecardService.getById(finalScorecardId),
            members: this.memberService.getAll(),
            allScorecards: this.scorecardService.getAll(),
          }),
        )) || {};

      const finalScorecard = scorecard?.scorecard || scorecard;

      if (!finalScorecard) {
        this.snackBar.open('Scorecard not found', 'Close', { duration: 3000 });
        return;
      }

      // Parse string data if needed
      parseStringData(finalScorecard);

      const scorecardList = allScorecards?.scorecards || allScorecards || [];

      // Create printable players
      const players: PrintablePlayer[] =
        match.lineUps
          ?.map((memberId: any) => {
            const member = members ? members.find((m: any) => m._id === memberId) : null;
            if (member) {
              const memberScorecard = getMemberScorecard(finalScorecard.course, member.scorecardsId || [], scorecardList);
              return {
                member,
                handicap: this.handicapService.calculateCourseHandicap(
                  member.usgaIndex || 0,
                  finalScorecard?.slope,
                ),
                teeAbreviation: memberScorecard?.teeAbreviation || '',
              };
            }
            return null;
          })
          .filter(Boolean) || [];

      if (players.length === 0) {
        this.snackBar.open('No players assigned to this match', 'Close', { duration: 3000 });
        return;
      }

      // Convert to interface types expected by the service
      const matchData: MatchData = {
        _id: match._id!,
        description: match.name || 'Golf Match',
        course: finalScorecard.course,
        teeTime: match.datePlayed || new Date().toISOString(),
        members: players.map((p) => p.member._id!),
      };

      const scorecardData: ScorecardData = {
        _id: finalScorecard._id || '',
        course: finalScorecard.course || '',
        // courseName: finalScorecard.name || 'Golf Course',
        tees: finalScorecard.courseTeeName || 'Regular',
        teeAbreviation: finalScorecard.teeAbreviation || '',
        pars: finalScorecard.pars || Array(18).fill(4),
        hCaps: finalScorecard.hCaps || Array.from({ length: 18 }, (_, i) => i + 1),
        distances: finalScorecard.yards || Array(18).fill(0),
      };
     
      // Generate PDF using the service
      // Group players into foursomes
      const groups: PrintablePlayer[][] = [];
      for (let i = 0; i < players.length; i += 4) {
        groups.push(players.slice(i, i + 4));
      }

      await this.pdfService.generateScorecardPDF(matchData, scorecardData, groups, {
        openInNewWindow: true,
      });

      this.snackBar.open(
        'Scorecard ready - choose Download, Email, or Print from the preview window!',
        'Close',
        { duration: 5000 },
      );
    } catch (error) {
      console.error('Error generating scorecard:', error);
      this.snackBar.open('Error generating scorecard', 'Close', { duration: 3000 });
    }
  }

  addMatch() {
    if (!this.isAuthorized) {
      // Could add snackbar notification here if needed
      return;
    }
    this.router.navigate(['/matches/add']);
  }

  deleteMatch(id: string) {
    if (!id) return;
    if (!this.isAuthorizedToDelete) {
      // The effects will handle the error snackbar display
      return;
    }

    // Get the match details for the confirmation dialog
    this.store
      .select(selectMatchById(id))
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((match) => {
        if (match) {
          const matchName = match.name || `Match ${id}`;

          this.confirmDialog.confirmDelete(matchName, 'match').subscribe((confirmed) => {
            if (confirmed) {
              this.store.dispatch(MatchActions.deleteMatch({ id }));
            }
          });
        }
      });
  }


  updateStatus(id: string, status: string) {
    // Get match details for audit logging
    this.store
      .select(selectMatchById(id))
      .pipe(take(1))
      .subscribe((match) => {
        if (!match) return;

        const name = match.name;
        const author = match.author;

        // Warn user and create HCap records when completing a match
        const completing =
          (status || '').toLowerCase() === 'completed' ||
          (status || '').toLowerCase() === 'complete';
        if (completing) {
          this.confirmDialog
            .confirmAction(
              'Complete Match',
              'Completing this match will create/update handicap records for players with posted score > 50. Do you want to continue?',
              'Complete',
              'Cancel',
            )
            .subscribe(async (confirmed) => {
              if (!confirmed) return;
              try {
                await this.createHcapRecordsForMatch(id);
                this.store.dispatch(MatchActions.updateMatchStatus({ id, status, name, author }));
                this.snackBar.open(
                  'Match completed — handicaps updated (where applicable).',
                  'Close',
                  {
                    duration: 4000,
                  },
                );
              } catch (err) {
                console.error('Error creating HCap records:', err);
                this.snackBar.open(
                  'Error creating handicap records. Match status not changed.',
                  'Close',
                  { duration: 6000 },
                );
              }
            });
          return;
        }

        this.store.dispatch(MatchActions.updateMatchStatus({ id, status, name, author }));
      });
  }

  private async createHcapRecordsForMatch(matchId: string): Promise<any> {
    // Fetch scores for this match
    const resp: any = await lastValueFrom(this.scoreService.getScoresByMatch(matchId));
    const matchScores: any[] = resp?.scores || resp || [];

    const currentUser = this.authService.getAuthorObject();

    // Only process players with a valid posted score
    const eligible = matchScores.filter((s: any) => {
      const posted = s.postedScore ?? s.score ?? 0;
      return typeof posted === 'number' && posted > 50;
    });

    // Deduplicate by memberId — prefer higher posted score, then most recent date
    const uniqueMap = new Map<string, any>();
    for (const s of eligible) {
      const key = typeof s.memberId === 'string' ? s.memberId : s.memberId?._id || s._id;
      if (!key) { uniqueMap.set(s._id || JSON.stringify(s), s); continue; }
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      } else {
        const ex = uniqueMap.get(key);
        const exPosted = ex.postedScore ?? ex.score ?? 0;
        const curPosted = s.postedScore ?? s.score ?? 0;
        if (curPosted > exPosted || new Date(s.datePlayed || 0) > new Date(ex.datePlayed || 0)) {
          uniqueMap.set(key, s);
        }
      }
    }

    // Load existing HCap records once for upsert logic
    let existingHcaps: any[] = [];
    try {
      const respAll: any = await lastValueFrom(this.hcapService.getAll());
      existingHcaps = respAll?.hcaps || respAll || [];
    } catch (e) {
      console.warn('Failed to load existing HCap records:', e);
    }
    const existingMap = new Map<string, any>();
    for (const h of existingHcaps) {
      const mId = typeof h.memberId === 'string' ? h.memberId : h.memberId?._id || null;
      const maId = typeof h.matchId === 'string' ? h.matchId : h.matchId?._id || null;
      if (mId && maId) existingMap.set(`${mId}:${maId}`, h);
    }

    const createPromises = Array.from(uniqueMap.values()).map(async (currentScore: any) => {
      try {
        const memberId =
          typeof currentScore.memberId === 'string'
            ? currentScore.memberId
            : currentScore.memberId?._id || null;

        // Load member for name / current handicap
        let member: any = null;
        if (memberId) {
          try { member = await lastValueFrom(this.memberService.getById(memberId)); } catch {}
        }

        // Fetch up to 19 most recent prior scores for this member (excluding this match)
        let priorScores: any[] = [];
        if (memberId) {
          try {
            const priorResp: any = await lastValueFrom(this.scoreService.getScoresByMember(memberId));
            const allMemberScores: any[] = priorResp?.scores || priorResp || [];
            priorScores = allMemberScores
              .filter((s: any) => {
                const sMatchId = typeof s.matchId === 'string' ? s.matchId : s.matchId?._id;
                return sMatchId !== matchId && s._id !== currentScore._id;
              })
              .sort((a: any, b: any) =>
                new Date(b.datePlayed || 0).getTime() - new Date(a.datePlayed || 0).getTime()
              )
              .slice(0, 19);
          } catch (e) {
            console.warn('Failed to fetch prior scores for member', memberId, e);
          }
        }

        // Compute new handicap from current score + up to 19 prior scores
        const scoresToUse = [currentScore, ...priorScores];
        const newHCapStr = this.hcapComputeService.computeHandicapFromScores(scoresToUse);
        const newHCap = newHCapStr ? parseFloat(newHCapStr) : null;

        console.log(
          `HCap for member ${memberId}: current score ${currentScore.postedScore}, ` +
          `prior scores used: ${priorScores.length}, newHCap: ${newHCapStr}`
        );

        const hcapRecord: any = {
          name: currentScore.name || (member ? `${member.firstName} ${member.lastName || ''}`.trim() : ''),
          postedScore: currentScore.postedScore ?? currentScore.score ?? null,
          currentHCap: member?.handicap ?? member?.usgaIndex ?? null,
          newHCap,
          rochDifferentialToday: currentScore.rochDifferentialToday ?? null,
          usgaDifferentialToday: currentScore.usgaDifferentialToday ?? null,
          datePlayed: currentScore.datePlayed || new Date().toISOString(),
          usgaIndexForTodaysScore: currentScore.usgaIndexForTodaysScore ?? currentScore.usgaIndex ?? null,
          handicap: member?.handicap ?? null,
          scoreId: currentScore._id || null,
          scorecardId:
            (currentScore.scorecardId &&
              (typeof currentScore.scorecardId === 'string'
                ? currentScore.scorecardId
                : currentScore.scorecardId._id)) || null,
          scCourse: currentScore.scCourse || '',
          scTees: currentScore.scTees || '',
          scRating: currentScore.scRating || null,
          scSlope: currentScore.scSlope || null,
          scPar: currentScore.scPar || null,
          matchId:
            (currentScore.matchId &&
              (typeof currentScore.matchId === 'string'
                ? currentScore.matchId
                : currentScore.matchId._id)) || matchId,
          memberId,
          author: currentUser,
        };

        // Upsert: update existing HCap record for same member+match, or create new
        const key = memberId ? `${memberId}:${matchId}` : null;
        if (key && existingMap.has(key)) {
          try {
            return await lastValueFrom(this.hcapService.update(existingMap.get(key)._id, hcapRecord));
          } catch (e) {
            console.warn('Failed to update HCap, falling back to create:', e);
          }
        }

        // Also update member's handicap field if newHCap changed
        if (memberId && newHCap !== null) {
          try {
            this.memberService.update(memberId, {
              handicap: newHCap,
              datePlayed: currentScore.datePlayed || new Date().toISOString(),
            } as any).subscribe({
              next: () => console.log(`Updated member ${memberId} handicap to ${newHCap}`),
              error: (e) => console.warn('Failed to update member handicap:', e),
            });
          } catch {}
        }

        return await lastValueFrom(this.hcapService.create(hcapRecord));
      } catch (err) {
        console.error('Failed to create HCap for score:', currentScore, err);
        return null;
      }
    });

    return Promise.all(createPromises);
  }

  refreshMatches() {
    this.store.dispatch(MatchActions.loadMatches());
  }

  loadMatchesByStatus(status: string) {
    this.store.dispatch(MatchActions.loadMatchesByStatus({ status }));
  }

  loadAllMatches() {
    this.store.dispatch(MatchActions.loadMatches());
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'primary';
      case 'closed':
        return 'accent';
      case 'completed':
        return 'warn';
      case 'needs_review':
        return 'warn';
      default:
        return '';
    }
  }

  getPlayerCount(match: Match): number {
    // Prefer an explicit players count if available (some backends provide this),
    // otherwise fall back to the lineUps array length when populated.
    if (typeof match.players === 'number') {
      return match.players;
    }
    if (match.lineUps && Array.isArray(match.lineUps)) {
      return match.lineUps.length;
    }
    return 0;
  }

  private emailScorecard(
    pdfBlob: Blob,
    filename: string,
    match: Match,
    scorecard: Scorecard,
    players: PrintablePlayer[],
  ): void {
    const course = scorecard?.course;
    const matchName = match?.name || 'Match';
    const matchDate = match?.datePlayed
      ? new Date(match.datePlayed).toLocaleDateString()
      : new Date().toLocaleDateString();

    const subject = `Golf Scorecard - ${course} - ${matchDate}`;
    const body = `Please find attached the scorecard for ${matchName} at ${course} on ${matchDate}.\n\nPlayers:\n${players
      .map((p) => `• ${p.member.firstName} ${p.member.lastName} (${p.handicap})`)
      .join('\n')}\n\nGenerated on ${new Date().toLocaleDateString()}`;

    // Download the PDF first
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Open default email client
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      body + '\n\n[Please attach the downloaded PDF file: ' + filename + ']',
    )}`;
    window.open(mailtoLink);

    this.snackBar.open(
      `PDF downloaded as: ${filename}. Check your Downloads folder to attach to email.`,
      'Close',
      { duration: 10000 },
    );
  }


}
