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
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, forkJoin, combineLatest, lastValueFrom } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { ScoreService } from '../../services/scoreService';
import { HCapService } from '../../services/hcapService';
import { Match } from '../../models/match';
// import { Member } from '../../models/member';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ConfigurationService } from '../../services/configuration.service';
import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScorecardPdfService } from '../../services/scorecard-pdf.service';
import { HandicapCalculationService } from '../../services/handicap-calculation.service';
import { PrintablePlayer } from '../../models/printable-player.interface';
import { MatchData, ScorecardData } from '../../models/scorecard.interface';
import { ScorecardService, Scorecard } from '../../services/scorecardService';
import * as MatchActions from '../../store/actions/match.actions';
import { parseStringData } from '../../utils/string-utils';


import { 
  selectAllMatches, 
  selectMatchesLoading, 
  selectMatchesError,
  selectMatchStats,
  selectMatchById
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
    MatPaginatorModule
  ]
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
  private configService = inject(ConfigurationService);
  private scoreService = inject(ScoreService);
  private hcapService = inject(HCapService);

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.matches$ = this.store.select(selectAllMatches);
    this.loading$ = this.store.select(selectMatchesLoading);
    this.error$ = this.store.select(selectMatchesError);
    this.stats$ = this.store.select(selectMatchStats);
    
    // Setup basic observables
    this.totalMatches$ = this.matches$.pipe(map(matches => matches.length));
    this.paginatedMatches$ = this.matches$; // Will be updated in ngOnInit
  }

  get isAdmin(): boolean {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    // Dispatch action to load matches
    this.store.dispatch(MatchActions.loadMatches());
    
    // Setup pagination with configuration
    this.setupPagination();
  }

  private setupPagination(): void {
    // Get page size from configuration
    const displayConfig = this.configService.displayConfig();
    this.pageSize = displayConfig.matchListPageSize;
    
    // Setup paginated matches observable
    this.paginatedMatches$ = this.matches$.pipe(
      map(matches => {
        const startIndex = this.pageIndex * this.pageSize;
        return matches.slice(startIndex, startIndex + this.pageSize);
      })
    );

    // Subscribe to configuration changes so pageSize and paginator options update dynamically
    this.configService.config$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(cfg => {
        const newSize = cfg?.display?.matchListPageSize;
        const newPageSizeOptions = cfg?.pagination?.pageSizeOptions;
        const newShowFirstLast = cfg?.pagination?.showFirstLastButtons;
        const newShowPageSizeOptions = cfg?.pagination?.showPageSizeOptions;

        // Update page size options if changed
        if (Array.isArray(newPageSizeOptions) && JSON.stringify(newPageSizeOptions) !== JSON.stringify(this.pageSizeOptions)) {
          this.pageSizeOptions = newPageSizeOptions;
        }

        if (typeof newShowFirstLast === 'boolean') {
          this.showFirstLastButtons = newShowFirstLast;
        }

        if (typeof newShowPageSizeOptions === 'boolean') {
          this.showPageSizeOptions = newShowPageSizeOptions;
        }

        // Update pageSize and reset to first page when page size changes to avoid empty page
        if (typeof newSize === 'number' && newSize > 0 && newSize !== this.pageSize) {
          this.onPageChange({ pageIndex: 0, pageSize: newSize } as PageEvent);
        }
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  editMatch(id: string) {
    if (!this.isAdmin) {
      // Could add snackbar notification here if needed
      return;
    }
    this.router.navigate(['/matches/edit', id]);
  }

  enterScores(id: string) {
    if (!id) return;
    if (!this.isAdmin) {
      // Could add snackbar notification here if needed
      return;
    }
    
    // Check configuration for score entry mode
    const scoringConfig = this.configService.scoringConfig();
    const route = scoringConfig.scoreEntryMode === 'simple' 
      ? ['/matches', id, 'simple-score-entry']
      : ['/matches', id, 'score-entry'];
    
    this.router.navigate(route);
  }

  async printScorecard(id: string) {
    if (!id) return;

    this.snackBar.open('Generating scorecard...', 'Close', { duration: 2000 });

    try {
      // Load match data
      const matchResponse = await this.matchService.getById(id).toPromise();
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

      const finalScorecardId = typeof scorecardId === 'string' ? scorecardId.trim() : scorecardId._id;

      // Load scorecard and members in parallel
      const { scorecard, members } = await forkJoin({
        scorecard: this.scorecardService.getById(finalScorecardId),
        members: this.memberService.getAll()
      }).toPromise() || {};

      const finalScorecard = scorecard?.scorecard || scorecard;
      
      if (!finalScorecard) {
        this.snackBar.open('Scorecard not found', 'Close', { duration: 3000 });
        return;
      }

      // Parse string data if needed
      parseStringData(finalScorecard);

      // Create printable players
      const players: PrintablePlayer[] = match.lineUps?.map((memberId: any) => {
        const member = members ? members.find((m: any) => m._id === memberId) : null;
        if (member) {
          return {
            member,
            handicap: this.handicapService.calculateCourseHandicap(member.usgaIndex || 0, finalScorecard?.slope)
          };
        }
        return null;
      }).filter(Boolean) || [];

      if (players.length === 0) {
        this.snackBar.open('No players assigned to this match', 'Close', { duration: 3000 });
        return;
      }

      // Convert to interface types expected by the service
      const matchData: MatchData = {
        _id: match._id!,
        description: match.name || 'Golf Match',
        course: { name: finalScorecard.name || 'Golf Course' },
        teeTime: match.datePlayed || new Date().toISOString(),
        members: players.map(p => p.member._id!)
      };

      const scorecardData: ScorecardData = {
        _id: finalScorecard._id || '',
        course: finalScorecard._id || '',
        courseName: finalScorecard.name || 'Golf Course',
        tees: finalScorecard.courseTeeName || 'Regular',
        pars: finalScorecard.pars || Array(18).fill(4),
        hCaps: finalScorecard.hCaps || Array.from({length: 18}, (_, i) => i + 1),
        distances: finalScorecard.yards || Array(18).fill(0)
      };

      // Generate PDF using the service
      // Group players into foursomes
      const groups: PrintablePlayer[][] = [];
      for (let i = 0; i < players.length; i += 4) {
        groups.push(players.slice(i, i + 4));
      }

      await this.pdfService.generateScorecardPDF(
        matchData, 
        scorecardData, 
        groups,
        { openInNewWindow: true }
      );

      this.snackBar.open('Scorecard ready - choose Download, Email, or Print from the preview window!', 'Close', { duration: 5000 });

    } catch (error) {
      console.error('Error generating scorecard:', error);
      this.snackBar.open('Error generating scorecard', 'Close', { duration: 3000 });
    }
  }

  addMatch() {
    if (!this.isAdmin) {
      // Could add snackbar notification here if needed
      return;
    }
    this.router.navigate(['/matches/add']);
  }

  deleteMatch(id: string) {
    if (!id) return;
    if (!this.isAdmin) {
      // The effects will handle the error snackbar display
      return;
    }

    // Get the match details for the confirmation dialog
    this.store.select(selectMatchById(id))
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(match => {
        if (match) {
          const matchName = match.name || `Match ${id}`;
          
          this.confirmDialog.confirmDelete(matchName, 'match').subscribe(confirmed => {
            if (confirmed) {
              this.store.dispatch(MatchActions.deleteMatch({ id }));
            }
          });
        }
      });
  }

  updateStatus(id: string, status: string) {
    // Warn user and create HCap records when completing a match
    const completing = (status || '').toLowerCase() === 'completed' || (status || '').toLowerCase() === 'complete';
    if (completing) {
      this.confirmDialog
        .confirmAction(
          'Complete Match',
          'Completing this match will create/update handicap records for players with posted score > 50. Do you want to continue?',
          'Complete',
          'Cancel'
        )
        .subscribe(async (confirmed) => {
          if (!confirmed) return;
          try {
            await this.createHcapRecordsForMatch(id);
            this.store.dispatch(MatchActions.updateMatchStatus({ id, status }));
            this.snackBar.open('Match completed — handicaps updated (where applicable).', 'Close', { duration: 4000 });
          } catch (err) {
            console.error('Error creating HCap records:', err);
            this.snackBar.open('Error creating handicap records. Match status not changed.', 'Close', { duration: 6000 });
          }
        });
      return;
    }

    this.store.dispatch(MatchActions.updateMatchStatus({ id, status }));
  }

    private getCurrentUserEmail(): string {
    const user = this.authService.user;
    return user?.email || user?.name || 'unknown';
  }

  private async createHcapRecordsForMatch(matchId: string): Promise<any> {
    // Fetch scores for the match
    const resp: any = await lastValueFrom(this.scoreService.getScoresByMatch(matchId));
    const scores = resp?.scores || resp || [];
    const currentUserEmail = await this.getCurrentUserEmail();
    const currentUser = this.authService.user;
    const currentUserId = currentUser?._id || currentUser?.id || currentUser?.userId || null;

    // Filter players with postedScore > 50 (or score if postedScore missing)
    const eligible = scores.filter((s: any) => {
      const posted = s.postedScore ?? s.score ?? 0;
      return typeof posted === 'number' && posted > 50;
    });

    // Deduplicate by memberId (or score id when no memberId). If multiple scores exist for same member,
    // prefer the one with higher postedScore or more recent datePlayed.
    const uniqueMap = new Map<string, any>();
    for (const s of eligible) {
      const key = typeof s.memberId === 'string' ? s.memberId : (s.memberId?._id || s._id);
      if (!key) {
        // fallback to score id when memberId missing
        const scoreKey = s._id || JSON.stringify(s);
        if (!uniqueMap.has(scoreKey)) uniqueMap.set(scoreKey, s);
        continue;
      }
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      } else {
        const existing = uniqueMap.get(key);
        const existingPosted = existing.postedScore ?? existing.score ?? 0;
        const currentPosted = s.postedScore ?? s.score ?? 0;
        const existingDate = new Date(existing.datePlayed || 0).getTime();
        const currentDate = new Date(s.datePlayed || 0).getTime();
        // Prefer higher posted score, then more recent date
        if (currentPosted > existingPosted || currentDate > existingDate) {
          uniqueMap.set(key, s);
        }
      }
    }

    const uniqueEligible = Array.from(uniqueMap.values());

    // Load existing HCap records once so we can update instead of creating duplicates
    let existingHcaps: any[] = [];
    try {
      const respAll: any = await lastValueFrom(this.hcapService.getAll());
      existingHcaps = respAll?.hcaps || respAll || [];
    } catch (e) {
      console.warn('Failed to load existing HCap records for dedupe/update:', e);
      existingHcaps = [];
    }

    const existingMap = new Map<string, any>();
    for (const h of existingHcaps) {
      const mId = typeof h.memberId === 'string' ? h.memberId : (h.memberId?._id || null);
      const maId = typeof h.matchId === 'string' ? h.matchId : (h.matchId?._id || null);
      if (mId && maId) existingMap.set(`${mId}:${maId}`, h);
    }

    const createPromises = uniqueEligible.map(async (score: any) => {
      try {
        const memberId = typeof score.memberId === 'string' ? score.memberId : (score.memberId?._id || null);
        let member: any = null;
        if (memberId) {
          try {
            member = await lastValueFrom(this.memberService.getById(memberId));
          } catch (e) {
            console.warn('Failed to load member for HCap creation:', memberId, e);
          }
        }

        const hcapRecord: any = {
          name: score.name || (member ? `${member.firstName} ${member.lastName || ''}`.trim() : ''),
          postedScore: score.postedScore ?? score.score ?? null,
          currentHCap: member?.handicap ?? member?.usgaIndex ?? null,
          newHCap: null,
          datePlayed: score.datePlayed || new Date().toISOString(),
          usgaIndexForTodaysScore: score.usgaIndexForTodaysScore ?? score.usgaIndex ?? null,
          handicap: member?.handicap ?? null,
          scoreId: score._id || null,
          scorecardId: (score.scorecardId && (typeof score.scorecardId === 'string' ? score.scorecardId : score.scorecardId._id)) || null,
          matchId: (score.matchId && (typeof score.matchId === 'string' ? score.matchId : score.matchId._id)) || matchId,
          memberId: memberId,
          user: currentUser,
        };
console.log('Preparing to create/update HCap record:', hcapRecord);
        // If existing HCap exists for the same member+match, update it instead of creating
        const key = memberId && matchId ? `${memberId}:${matchId}` : null;
        if (key && existingMap.has(key)) {
          const existing = existingMap.get(key);
          try {
            return await lastValueFrom(this.hcapService.update(existing._id, hcapRecord, currentUserId));
          } catch (e) {
            console.warn('Failed to update existing HCap, will try create as fallback:', e);
          }
        }

        // Call HCap service to create record
        return await lastValueFrom(this.hcapService.create(hcapRecord, currentUserId));
      } catch (err) {
        console.error('Failed to create HCap for score:', score, err);
        // continue without failing all
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
      case 'open': return 'primary';
      case 'closed': return 'accent';
      case 'completed': return 'warn';
      case 'needs_review': return 'warn';
      default: return '';
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

  // private getPageGroups(players: PrintablePlayer[]): PrintablePlayer[][] {
  //   const pageGroups: PrintablePlayer[][] = [];
  //   const playersPerPage = 4;
    
  //   for (let i = 0; i < players.length; i += playersPerPage) {
  //     const group = players.slice(i, i + playersPerPage);
  //     pageGroups.push(group);
  //   }
    
  //   if (pageGroups.length === 0) {
  //     pageGroups.push([]);
  //   }
    
  //   return pageGroups;
  // }

  // private addPreviewControls(previewWindow: Window, pdfBlob: Blob, filename: string, match: Match, scorecard: Scorecard, players: PrintablePlayer[]): void {
  //   setTimeout(() => {
  //     const controlsHtml = `
  //       <div style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: Arial, sans-serif;">
  //         <button id="downloadBtn" style="margin-right: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
  //           📥 Download
  //         </button>
  //         <button id="emailBtn" style="margin-right: 10px; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
  //           📧 Email
  //         </button>
  //         <button id="printBtn" style="padding: 8px 16px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
  //           🖨️ Print
  //         </button>
  //       </div>
  //     `;

  //     const controlsDiv = previewWindow.document.createElement('div');
  //     controlsDiv.innerHTML = controlsHtml;
  //     previewWindow.document.body.appendChild(controlsDiv);

  //     const downloadBtn = previewWindow.document.getElementById('downloadBtn');
  //     const emailBtn = previewWindow.document.getElementById('emailBtn');
  //     const printBtn = previewWindow.document.getElementById('printBtn');

  //     if (downloadBtn) {
  //       downloadBtn.addEventListener('click', () => {
  //         const url = URL.createObjectURL(pdfBlob);
  //         const a = previewWindow.document.createElement('a');
  //         a.href = url;
  //         a.download = filename;
  //         previewWindow.document.body.appendChild(a);
  //         a.click();
  //         previewWindow.document.body.removeChild(a);
  //         URL.revokeObjectURL(url);
  //       });
  //     }

  //     if (emailBtn) {
  //       emailBtn.addEventListener('click', () => {
  //         this.emailScorecard(pdfBlob, filename, match, scorecard, players);
  //       });
  //     }

  //     if (printBtn) {
  //       printBtn.addEventListener('click', () => {
  //         previewWindow.print();
  //       });
  //     }
  //   }, 1000);
  // }

  private emailScorecard(pdfBlob: Blob, filename: string, match: Match, scorecard: Scorecard, players: PrintablePlayer[]): void {
    const courseName = scorecard?.name || 'Golf Course';
    const matchName = match?.name || 'Match';
    const matchDate = match?.datePlayed ? 
      new Date(match.datePlayed).toLocaleDateString() : 
      new Date().toLocaleDateString();
    
    const subject = `Golf Scorecard - ${courseName} - ${matchDate}`;
    const body = `Please find attached the scorecard for ${matchName} at ${courseName} on ${matchDate}.\n\nPlayers:\n${players.map(p => `• ${p.member.firstName} ${p.member.lastName} (${p.handicap})`).join('\n')}\n\nGenerated on ${new Date().toLocaleDateString()}`;
    
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
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n[Please attach the downloaded PDF file: ' + filename + ']')}`;
    window.open(mailtoLink);

    this.snackBar.open(`PDF downloaded as: ${filename}. Check your Downloads folder to attach to email.`, 'Close', { duration: 10000 });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    
    // Update paginated matches
    this.paginatedMatches$ = this.matches$.pipe(
      map(matches => {
        const startIndex = this.pageIndex * this.pageSize;
        return matches.slice(startIndex, startIndex + this.pageSize);
      })
    );
  }

}