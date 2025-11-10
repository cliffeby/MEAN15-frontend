import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import jsPDF from 'jspdf';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScorecardService, Scorecard } from '../../services/scorecardService';
import * as MatchActions from '../../store/actions/match.actions';

interface PrintablePlayer {
  member: Member;
  handicap: number;
}
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
    MatIconModule
  ]
})
export class MatchListComponent implements OnInit, OnDestroy {
  matches$: Observable<Match[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;
  stats$: Observable<any>;
  
  private unsubscribe$ = new Subject<void>();
  private currentScorecard: Scorecard | null = null;

  private snackBar = inject(MatSnackBar);
  private matchService = inject(MatchService);
  private memberService = inject(MemberService);
  private scorecardService = inject(ScorecardService);

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
  }

  get isAdmin(): boolean {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    // Dispatch action to load matches
    this.store.dispatch(MatchActions.loadMatches());
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
            handicap: this.calculateCourseHandicap(member.usgaIndex || 0, finalScorecard)
          };
        }
        return null;
      }).filter(Boolean) || [];

      if (players.length === 0) {
        this.snackBar.open('No players assigned to this match', 'Close', { duration: 3000 });
        return;
      }

      // Store scorecard for drawing methods
      this.currentScorecard = finalScorecard;

      // Generate PDF
      await this.generateScorecardPDF(match, finalScorecard, players);

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
      default: return '';
    }
  }

  private calculateCourseHandicap(usgaIndex: number, scorecard: Scorecard): number {
    if (!scorecard?.slope) return 0;
    return Math.round((usgaIndex * scorecard.slope) / 113);
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

  private async generateScorecardPDF(match: Match, scorecard: Scorecard, players: PrintablePlayer[]): Promise<void> {
    // Create PDF with landscape orientation
    const pageWidth = 11 * 25.4; // 279.4mm
    const pageHeight = 8.5 * 25.4;  // 215.9mm
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    });

    const pageGroups = this.getPageGroups(players);
    
    // Calculate dimensions for two scorecards stacked vertically
    const cardWidth = pageWidth;
    const cardHeight = 3.8 * 25.4; // 96.52mm per scorecard
    const spacing = 6;
    const totalHeight = (2 * cardHeight) + spacing;
    const startY = (pageHeight - totalHeight) / 2;
    
    for (let pageIndex = 0; pageIndex < pageGroups.length; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage();
      }
      
      // Draw first scorecard on top
      this.drawScorecard(pdf, match, scorecard, pageGroups[pageIndex], 0, startY, cardWidth, cardHeight);
      
      // Draw second identical scorecard below the first
      this.drawScorecard(pdf, match, scorecard, pageGroups[pageIndex], 0, startY + cardHeight + spacing, cardWidth, cardHeight);
    }
    
    // Generate filename
    const matchDate = match?.datePlayed ? 
      new Date(match.datePlayed).toLocaleDateString().replace(/[/\\?%*:|"<>]/g, '-') : 
      new Date().toLocaleDateString().replace(/[/\\?%*:|"<>]/g, '-');
    const courseName = scorecard?.name?.replace(/[/\\?%*:|"<>]/g, '-') || 'golf';
    const filename = `scorecard-${courseName}-${matchDate}.pdf`;
    
    // Open PDF in preview window with Download/Email/Print buttons
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const previewWindow = window.open(pdfUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    
    if (previewWindow) {
      previewWindow.addEventListener('load', () => {
        this.addPreviewControls(previewWindow, pdfBlob, filename, match, scorecard, players);
      });
    }

    this.snackBar.open('Scorecard ready - choose Download, Email, or Print from the preview window!', 'Close', { duration: 5000 });
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

  // Add all the drawing methods from the printable scorecard component
  private drawScorecard(pdf: jsPDF, match: Match, scorecard: Scorecard, players: PrintablePlayer[], x: number, y: number, width: number, height: number): void {
    const margin = 2;
    const startX = x + margin;
    const startY = y + margin;
    const contentWidth = width - (2 * margin);
    const contentHeight = height - (2 * margin);
    
    this.drawHeader(pdf, match, scorecard, startX, startY, contentWidth);
    
    const tableY = startY + 8;
    this.drawTable(pdf, scorecard, players, startX, tableY, contentWidth, contentHeight - 8);
  }

  private drawHeader(pdf: jsPDF, match: Match, scorecard: Scorecard, x: number, y: number, width: number): void {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    
    const courseName = scorecard?.name || 'Golf Course';
    const tees = scorecard?.courseTeeName || 'Championship Tees';
    const par = `Par ${this.getCoursePar(scorecard)}`;
    const matchName = match?.name || '';
    const date = match?.datePlayed ? new Date(match.datePlayed).toLocaleDateString() : '';
    
    const headerText = `${courseName} • ${tees} • ${par} • ${matchName} • ${date}`;
    
    const textWidth = pdf.getTextWidth(headerText);
    const textX = x + (width - textWidth) / 2;
    
    pdf.text(headerText, textX, y + 4);
  }

  private getCoursePar(scorecard: Scorecard): number {
    if (scorecard?.par) {
      return scorecard.par;
    }
    if (scorecard?.pars && Array.isArray(scorecard.pars)) {
      return scorecard.pars.reduce((sum: number, par: number) => sum + (par || 4), 0);
    }
    return 72;
  }

  private getFrontNinePar(scorecard: Scorecard): number {
    if (scorecard?.pars && Array.isArray(scorecard.pars)) {
      return scorecard.pars.slice(0, 9).reduce((sum: number, par: number) => sum + (par || 4), 0);
    }
    return 36;
  }

  private getBackNinePar(scorecard: Scorecard): number {
    if (scorecard?.pars && Array.isArray(scorecard.pars)) {
      return scorecard.pars.slice(9, 18).reduce((sum: number, par: number) => sum + (par || 4), 0);
    }
    return 36;
  }

  private drawTable(pdf: jsPDF, scorecard: Scorecard, players: PrintablePlayer[], x: number, y: number, width: number, height: number): void {
    const playerColWidth = 25;
    const totalColWidth = 8;
    const holeColWidth = (width - playerColWidth - (3 * totalColWidth) - 4) / 21;
    
    const tableStartX = x + 3.175;
    let currentY = y;
    
    this.drawTableHeaders(pdf, scorecard, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 24;
    
    // Draw player rows
    if (players.length > 0) {
      this.drawPlayerRow(pdf, players[0], players, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    } else {
      this.drawEmptyPlayerRow(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    }
    currentY += 8;
    
    if (players.length > 1) {
      this.drawPlayerRow(pdf, players[1], players, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    } else {
      this.drawEmptyPlayerRow(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    }
    currentY += 8;
    
    this.drawMatchRow(pdf, 'One-ball', tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 8;
    
    this.drawMatchRow(pdf, 'Match', tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 8;
    
    this.drawMatchRow(pdf, 'Match', tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 8;
    
    if (players.length > 2) {
      this.drawPlayerRow(pdf, players[2], players, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    } else {
      this.drawEmptyPlayerRow(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    }
    currentY += 8;
    
    if (players.length > 3) {
      this.drawPlayerRow(pdf, players[3], players, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    } else {
      this.drawEmptyPlayerRow(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    }
    currentY += 8;
    
    this.drawMatchRow(pdf, 'One-ball', tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
  }

  private drawTableHeaders(pdf: jsPDF, scorecard: Scorecard, x: number, y: number, playerColWidth: number, holeColWidth: number, totalColWidth: number): void {
    pdf.setFontSize(8);
    pdf.setLineWidth(0.25);
    pdf.setFont('helvetica', 'bold');
    
    let currentX = x;
    let currentY = y;
    
    // HOLE row
    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'HOLE');
    for (let hole = 1; hole <= 18; hole++) {
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, hole.toString(), true, '#000000', '#FFFFFF');
      if (hole === 9) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, 'OUT', true);
      }
    }
    const finalColumns = ['IN', 'TOT', 'NET', 'POST'];
    for (const col of finalColumns) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, col, true);
    }
    
    // PAR row
    currentX = x;
    currentY += 8;
    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'PAR');
    for (let hole = 0; hole < 18; hole++) {
      const par = this.getParForHole(scorecard, hole);
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, par.toString(), true);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, this.getFrontNinePar(scorecard).toString(), true);
      }
    }
    const parTotals = [this.getBackNinePar(scorecard).toString(), this.getCoursePar(scorecard).toString(), '-', '-'];
    for (const total of parTotals) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, total, true);
    }
    
    // HCP row
    currentX = x;
    currentY += 8;
    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'HCP');
    for (let hole = 0; hole < 18; hole++) {
      const hcp = this.getHoleHandicap(scorecard, hole) || '-';
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, hcp.toString(), true);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
      }
    }
    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
    }
  }

  private getParForHole(scorecard: Scorecard, holeIndex: number): number {
    return scorecard?.pars?.[holeIndex] || 4;
  }

  private getHoleHandicap(scorecard: Scorecard, holeIndex: number): number {
    return scorecard?.hCaps?.[holeIndex] || 0;
  }

  private drawPlayerRow(pdf: jsPDF, player: PrintablePlayer, players: PrintablePlayer[], x: number, y: number, playerColWidth: number, holeColWidth: number, totalColWidth: number): void {
    let currentX = x;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    const playerName = this.getFormattedPlayerName(player);
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, playerName);
    
    pdf.setFont('helvetica', 'normal');
    
    // Get lowest handicap in the group for team stroke calculation
    const lowestHandicap = this.getLowestHandicapInGroup(players);
    

    
    for (let hole = 0; hole < 18; hole++) {
      const playerHandicap = player.handicap;
      const holeHandicap = this.getHoleHandicap(this.currentScorecard!, hole);
      
      // Individual stroke hole (small x in upper left) - can be multiple strokes
      const individualStrokeCount = this.getStrokeCountOnHole(playerHandicap, holeHandicap);
      
      // Team stroke hole (diagonal slash) - based on handicap difference from lowest player
      // Player gets team stroke if (their handicap - lowest handicap) >= hole handicap
      const handicapDifference = player.handicap - lowestHandicap;
      const getsTeamStroke = handicapDifference > 0 && handicapDifference >= holeHandicap;
      

      
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, undefined, false, undefined, undefined, getsTeamStroke, individualStrokeCount);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
      }
    }
    
    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
    }
  }

  private getLowestHandicapInGroup(players: PrintablePlayer[]): number {
    if (players.length === 0) return 0;
    return Math.min(...players.map(p => p.handicap));
  }

  private playerGetsStrokeOnHole(playerHandicap: number, holeHandicap: number): boolean {
    // Player gets a stroke if their handicap is greater than or equal to the hole's handicap
    // Hole handicaps are typically 1-18, where 1 is the hardest hole
    return playerHandicap >= holeHandicap && holeHandicap > 0;
  }

  private getStrokeCountOnHole(playerHandicap: number, holeHandicap: number): number {
    // Calculate how many strokes a player gets on a specific hole
    // For handicaps > 18, players get multiple strokes on harder holes
    if (holeHandicap <= 0) return 0;
    
    const strokesFromFirstRound = playerHandicap >= holeHandicap ? 1 : 0;
    const strokesFromSecondRound = playerHandicap >= (holeHandicap + 18) ? 1 : 0;
    
    return strokesFromFirstRound + strokesFromSecondRound;
  }

  private drawMatchRow(pdf: jsPDF, label: string, x: number, y: number, playerColWidth: number, holeColWidth: number, totalColWidth: number): void {
    let currentX = x;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const backgroundColor = '#E0E0E0';
    
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, label, false, backgroundColor);
    
    for (let hole = 0; hole < 18; hole++) {
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, undefined, false, backgroundColor);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, undefined, false, backgroundColor);
      }
    }
    
    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, undefined, false, backgroundColor);
    }
  }

  private drawEmptyPlayerRow(pdf: jsPDF, x: number, y: number, playerColWidth: number, holeColWidth: number, totalColWidth: number): void {
    let currentX = x;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, '________________________');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    for (let hole = 0; hole < 18; hole++) {
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
      }
    }
    
    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
    }
  }

  private drawCell(pdf: jsPDF, x: number, y: number, width: number, height: number, text?: string, centered: boolean = false, backgroundColor?: string, textColor?: string, drawSlash: boolean = false, strokeCount: number = 0): number {
    if (backgroundColor) {
      pdf.setFillColor(backgroundColor);
      pdf.rect(x, y, width, height, 'F');
    }
    
    pdf.rect(x, y, width, height);
    
    // Draw diagonal slash if requested (for team stroke holes)
    if (drawSlash) {
      pdf.setLineWidth(0.5);
      pdf.line(x, y + height, x + width, y); // Diagonal line from bottom-left to top-right
      pdf.setLineWidth(0.25); // Reset line width
    }

    // Draw small "x" marks for individual stroke holes (can be multiple)
    if (strokeCount > 0) {
      const oldFontSize = pdf.getFontSize();
      pdf.setFontSize(5); // Very small font
      pdf.setFont('helvetica', 'normal');
      
      if (strokeCount === 1) {
        // Single stroke - one "x" in upper left
        pdf.text('x', x + 0.5, y + 2);
      } else if (strokeCount === 2) {
        // Two strokes - two "x" marks
        pdf.text('x', x + 0.5, y + 2);
        pdf.text('x', x + 2.5, y + 2);
      } else if (strokeCount >= 3) {
        // Three or more strokes - show number instead
        pdf.setFontSize(6);
        pdf.text(strokeCount.toString(), x + 0.5, y + 2.5);
      }
      
      pdf.setFontSize(oldFontSize); // Restore original font size
    }
    
    if (text) {
      if (textColor) {
        pdf.setTextColor(textColor);
      }
      
      let textX = x + 1;
      
      if (centered) {
        const textWidth = pdf.getTextWidth(text);
        textX = x + (width - textWidth) / 2;
      }
      
      const textY = y + (height / 2) + 1;
      pdf.text(text, textX, textY);
      
      if (textColor) {
        pdf.setTextColor(0, 0, 0);
      }
    }
    
    return x + width;
  }

  private getFormattedPlayerName(player: PrintablePlayer): string {
    const firstName = player.member.firstName || '';
    const lastName = player.member.lastName || '';
    const handicap = player.handicap;
    
    const firstInitial = firstName.charAt(0).toUpperCase();
    return `${lastName}, ${firstInitial}. (${handicap})`;
  }
}