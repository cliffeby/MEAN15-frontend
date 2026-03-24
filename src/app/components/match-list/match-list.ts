import { Component, OnInit, OnDestroy, inject, HostBinding } from '@angular/core';
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
import { getGroupSizes } from '../../utils/pair-utils';

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
  @HostBinding('class.dark-theme') isDarkTheme = false;
  private mqListener: ((e: MediaQueryListEvent) => void) | null = null;

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
  private handicapService = inject(HandicapService);
  private hcapCalculationService = inject(HandicapCalculationService);
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
    this.configService.config$.pipe(take(1)).subscribe((cfg) => {
      this.pageSizeOptions = cfg?.pagination?.pageSizeOptions || [5, 10, 20, 50];
      this.pageSize = cfg?.display?.matchListPageSize || this.pageSizeOptions[0];
    });
  }

  get isAuthorized(): boolean {
    return this.authService.hasMinRole('fieldhand');
  }
  get isAuthorizedToDelete(): boolean {
    return this.authService.hasMinRole('admin');
  }

  ngOnInit() {
    // Apply theme from configuration
    try { this.applyTheme(this.configService.displayConfig().theme); } catch { /* ignore in tests */ }

    // Subscribe to configuration changes once (long-lived subscription)
    this.configService.config$.pipe(takeUntil(this.unsubscribe$)).subscribe((cfg) => {
      this.applyTheme(cfg.display.theme);
      const newPageSizeOptions = cfg?.pagination?.pageSizeOptions;
      const newShowFirstLast = cfg?.pagination?.showFirstLastButtons;
      const newShowPageSizeOptions = cfg?.pagination?.showPageSizeOptions;
      const newMatchPageSize = cfg?.display?.matchListPageSize;

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
      if (typeof newMatchPageSize === 'number' && newMatchPageSize !== this.pageSize) {
        this.pageSize = newMatchPageSize;
        this.pageIndex = 0;
        this.setupPagination();
      }
    });

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

      // Scroll to specific match after returning from score entry, else scroll to top of list
      const scrollToId = params['scrollToMatch'];
      setTimeout(() => {
        if (scrollToId) {
          const el = document.getElementById('match-' + scrollToId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('match-highlight');
            setTimeout(() => el.classList.remove('match-highlight'), 2000);
            return;
          }
        }
        const listEl = document.querySelector('.match-list');
        if (listEl) {
          listEl.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 150);
    });
    // Dispatch action to load matches
    this.store.dispatch(MatchActions.loadMatches());
    // Initial pagination setup (after query params and config are applied)
    this.setupPagination();
  }

  private setupPagination(): void {
    // Rebuild the paginated observable using current pageIndex and pageSize
    this.paginatedMatches$ = this.matches$.pipe(
      map((matches) => {
        const startIndex = this.pageIndex * this.pageSize;
        return matches.slice(startIndex, startIndex + this.pageSize);
      }),
    );
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    if (this.mqListener) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.mqListener);
      this.mqListener = null;
    }
  }

  private applyTheme(theme: string) {
    if (!theme) theme = 'auto';
    if (theme === 'dark') {
      this.isDarkTheme = true;
    } else if (theme === 'light') {
      this.isDarkTheme = false;
    } else {
      if (typeof window !== 'undefined' && (window as any).matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        this.isDarkTheme = !!mq.matches;
        if (this.mqListener) mq.removeEventListener('change', this.mqListener);
        this.mqListener = (e: MediaQueryListEvent) => { this.isDarkTheme = !!e.matches; };
        mq.addEventListener('change', this.mqListener);
      } else {
        this.isDarkTheme = false;
      }
    }
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
                rochIndex: this.hcapCalculationService.calculateCourseHandicap(
                  member.usgaIndexB4Round || 0,
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
     
      // Build print groups using foursomeIdsTEMP (saved pairings) if available,
      // otherwise fall back to handicap-order grouping.
      const foursomeIds: string[][] = (match.foursomeIdsTEMP || []) as string[][];
      const playerMap = new Map<string, PrintablePlayer>(
        (players as PrintablePlayer[]).map((p: PrintablePlayer) => [p.member._id!, p])
      );
      const foursomes: (PrintablePlayer | null)[][] = [];

      if (foursomeIds.length > 0) {
        for (const ids of foursomeIds) {
          if (ids.length === 4) {
            // Stored as [A1,A2,B1,B2]; Team1 = A1+B2, Team2 = A2+B1
            foursomes.push([
              playerMap.get(ids[0]) ?? null,
              playerMap.get(ids[3]) ?? null,
              playerMap.get(ids[1]) ?? null,
              playerMap.get(ids[2]) ?? null,
            ]);
          } else if (ids.length === 3) {
            // [A1,A2,B1] → A1+B1 paired, A2 lone
            foursomes.push([
              playerMap.get(ids[0]) ?? null,
              playerMap.get(ids[2]) ?? null,
              playerMap.get(ids[1]) ?? null,
              null,
            ]);
          } else {
            const group: (PrintablePlayer | null)[] = ids.map(id => playerMap.get(id) ?? null);
            while (group.length < 4) group.push(null);
            foursomes.push(group);
          }
        }
      } else {
        // Fallback: sort by rochIndex and pair using the standard A/B algorithm
        const sorted = [...(players as PrintablePlayer[])].sort(
          (a: PrintablePlayer, b: PrintablePlayer) => (a.rochIndex ?? 99) - (b.rochIndex ?? 99)
        );
        const groupSizes = getGroupSizes(sorted.length);
        const numA = 2 * groupSizes.filter((s: number) => s >= 3).length;
        const aPlayers = sorted.slice(0, numA);
        const bPlayers = sorted.slice(numA);
        let aIdx = 0, bIdx = 0;
        for (const size of groupSizes) {
          if (size === 4) {
            const A1 = aPlayers[aIdx] ?? null;
            const A2 = aPlayers[aIdx + 1] ?? null;
            const B1 = bPlayers[bIdx] ?? null;
            const B2 = bPlayers[bIdx + 1] ?? null;
            aIdx += 2; bIdx += 2;
            foursomes.push([A1, B2, A2, B1]);
          } else if (size === 3) {
            const A1 = aPlayers[aIdx] ?? null;
            const A2 = aPlayers[aIdx + 1] ?? null;
            const B1 = bPlayers[bIdx] ?? null;
            aIdx += 2; bIdx += 1;
            foursomes.push([A1, B1, A2, null]);
          } else if (size === 2) {
            foursomes.push([bPlayers[bIdx] ?? null, bPlayers[bIdx + 1] ?? null, null, null]);
            bIdx += 2;
          } else {
            foursomes.push([bPlayers[bIdx] ?? null, null, null, null]);
            bIdx += 1;
          }
        }
      }

      // Within each 2-man team, put the lower-handicap player on line 1.
      // Team 1 = slots 0-1, Team 2 = slots 2-3.
      for (const group of foursomes) {
        for (const [i, j] of [[0, 1], [2, 3]] as [number, number][]) {
          const p1 = group[i];
          const p2 = group[j];
          if (p1 !== null && p2 !== null && p1.rochIndex > p2.rochIndex) {
            group[i] = p2;
            group[j] = p1;
          }
        }
      }

      await this.pdfService.generateScorecardPDF(matchData, scorecardData, foursomes, {
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
              'Completing this match will create/update rochIndex records for players with posted score > 50. Do you want to continue?',
              'Complete',
              'Cancel',
            )
            .subscribe(async (confirmed) => {
              if (!confirmed) return;
              try {
                await this.createHcapRecordsForMatch2(id);
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
                  'Error creating rochIndex records. Match status not changed.',
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

  private async createHcapRecordsForMatch2(matchId: string): Promise<any> {
    const author = this.authService.getAuthorObject();

    // Fetch scores for this match
    const resp: any = await lastValueFrom(this.scoreService.getScoresByMatch(matchId));
    const matchScores: any[] = resp?.scores || resp || [];

    // Only process players with a valid posted score
    const eligible = matchScores.filter((s: any) => {
      const posted = s.postedScore ?? s.score ?? 0;
      return typeof posted === 'number' && posted > 50;
    });

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

    const createPromises = eligible.map(async (score: any) => {
      try {
        const memberId = typeof score.memberId === 'string' ? score.memberId : score.memberId?._id || null;

        // Fetch up to 19 prior scores for this member (excluding this match) for handicap computation
        let priorScores: any[] = [];
        if (memberId) {
          try {
            const priorResp: any = await lastValueFrom(this.scoreService.getScoresByMember(memberId));
            const allMemberScores: any[] = priorResp?.scores || priorResp || [];
            priorScores = allMemberScores
              .filter((s: any) => {
                const sMatchId = typeof s.matchId === 'string' ? s.matchId : s.matchId?._id;
                return sMatchId !== matchId && s._id !== score._id;
              })
              .sort((a: any, b: any) =>
                new Date(b.datePlayed || 0).getTime() - new Date(a.datePlayed || 0).getTime()
              )
              .slice(0, 19);
          } catch (e) {
            console.warn('Failed to fetch prior scores for member', memberId, e);
          }
        }

        // const newHCapStr = this.handicapService.computeHandicapFromScores([score, ...priorScores]);
        // const newHCapIndex = newHCapStr ? parseFloat(newHCapStr) : null;

        const rochNewIndexStr = this.handicapService.computeRochFromScores([score, ...priorScores]);
        const usgaNewIndexStr = this.handicapService.computeUSGAFromScores([score, ...priorScores]);
        const rochNewIndex = rochNewIndexStr ? parseFloat(rochNewIndexStr) : null;
        const usgaNewIndex = usgaNewIndexStr ? parseFloat(usgaNewIndexStr) : null;
       
        const hcapRecord: any = {
          name: score.name || '',
          postedScore: score.postedScore ?? score.score ?? null,
          datePlayed: score.datePlayed || new Date().toISOString(),
          author: score.author || author,
          matchId,
          memberId,
          differentialForRound: score.differentialForRound ?? null,
          // usgaDifferentialForTodaysRound: score.usgaDifferentialForTodaysRound ?? null,
          rochIndexB4Round: score.rochIndexB4Round ?? null,
          usgaIndexB4Round: score.usgaIndexB4Round  ?? null,
          rochIndexAfterRound: rochNewIndex ?? score.rochIndex ?? null,
          usgaIndexAfterRound: usgaNewIndex ?? score.usgaIndex ?? null,
          // rochHandicapForThisRound: score.rochIndex ?? null,
          // usgaHandicapForThisRound: score.usgaIndex ?? null,
          teeAbreviation: score.teeAbreviation || null,
          scCourse: score.scCourse || null,
          scTees: score.scTees || null,
          scSlope: score.scSlope ?? null,
          scRating: score.scRating ?? null,
          usgaIndexAfterTodaysScore: score.usgaIndexAfterTodaysScore ?? score.usgaIndex ?? null,
          rochIndexAfterTodaysScore: score.rochIndexAfterTodaysScore ?? score.rochIndex ?? null,
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

        return await lastValueFrom(this.hcapService.create(hcapRecord));
      } catch (err) {
        console.error('Failed to create HCap record for score:', score, err);
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
      .map((p) => `• ${p.member.firstName} ${p.member.lastName} (${p.rochIndex})`)
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
