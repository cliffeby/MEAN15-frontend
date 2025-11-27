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
import { Observable, Subject, forkJoin, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
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
  
  private unsubscribe$ = new Subject<void>();
  private currentScorecard: Scorecard | null = null;

  private snackBar = inject(MatSnackBar);
  private matchService = inject(MatchService);
  private memberService = inject(MemberService);
  private scorecardService = inject(ScorecardService);
  private pdfService = inject(ScorecardPdfService);
  private handicapService = inject(HandicapCalculationService);
  private configService = inject(ConfigurationService);

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
    this.router.navigate(['/matches', id, 'score-entry']);
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
      this.parseStringData(finalScorecard);

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
    this.store.dispatch(MatchActions.updateMatchStatus({ id, status }));
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



  private parseStringData(scorecard: any): void {
    if (!scorecard) return;
    
    // Parse par data from string if arrays are missing
    if ((!scorecard.pars || !Array.isArray(scorecard.pars)) && scorecard.parInputString) {
      scorecard.pars = this.parseNumberString(scorecard.parInputString);
    }
    
    // Parse handicap data from string if arrays are missing
    if ((!scorecard.hCaps || !Array.isArray(scorecard.hCaps)) && scorecard.hCapInputString) {
      scorecard.hCaps = this.parseNumberString(scorecard.hCapInputString);
    }
    
    // Parse yardage data from string if arrays are missing
    if ((!scorecard.yards || !Array.isArray(scorecard.yards)) && scorecard.yardsInputString) {
      scorecard.yards = this.parseNumberString(scorecard.yardsInputString);
    }
  }
  
  private parseNumberString(inputString: string): number[] {
    if (!inputString) return [];
    
    const numbers = inputString
      .split(/[,\s\t]+/)
      .map(str => str.trim())
      .filter(str => str.length > 0)
      .map(str => parseInt(str, 10))
      .filter(num => !isNaN(num));
    
    return numbers;
  }

  private getPageGroups(players: PrintablePlayer[]): PrintablePlayer[][] {
    const pageGroups: PrintablePlayer[][] = [];
    const playersPerPage = 4;
    
    for (let i = 0; i < players.length; i += playersPerPage) {
      const group = players.slice(i, i + playersPerPage);
      pageGroups.push(group);
    }
    
    if (pageGroups.length === 0) {
      pageGroups.push([]);
    }
    
    return pageGroups;
  }

  private addPreviewControls(previewWindow: Window, pdfBlob: Blob, filename: string, match: Match, scorecard: Scorecard, players: PrintablePlayer[]): void {
    setTimeout(() => {
      const controlsHtml = `
        <div style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: Arial, sans-serif;">
          <button id="downloadBtn" style="margin-right: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
            📥 Download
          </button>
          <button id="emailBtn" style="margin-right: 10px; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
            📧 Email
          </button>
          <button id="printBtn" style="padding: 8px 16px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
            🖨️ Print
          </button>
        </div>
      `;

      const controlsDiv = previewWindow.document.createElement('div');
      controlsDiv.innerHTML = controlsHtml;
      previewWindow.document.body.appendChild(controlsDiv);

      const downloadBtn = previewWindow.document.getElementById('downloadBtn');
      const emailBtn = previewWindow.document.getElementById('emailBtn');
      const printBtn = previewWindow.document.getElementById('printBtn');

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          const url = URL.createObjectURL(pdfBlob);
          const a = previewWindow.document.createElement('a');
          a.href = url;
          a.download = filename;
          previewWindow.document.body.appendChild(a);
          a.click();
          previewWindow.document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }

      if (emailBtn) {
        emailBtn.addEventListener('click', () => {
          this.emailScorecard(pdfBlob, filename, match, scorecard, players);
        });
      }

      if (printBtn) {
        printBtn.addEventListener('click', () => {
          previewWindow.print();
        });
      }
    }, 1000);
  }

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