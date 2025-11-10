import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScorecardService, Scorecard } from '../../services/scorecardService';
import { AuthService } from '../../services/authService';
import { Match } from '../../models/match';
import { Member } from '../../models/member';

interface PrintablePlayer {
  member: Member;
  handicap: number;
}

@Component({
  selector: 'app-printable-scorecard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './printable-scorecard.html',
  styleUrls: ['./printable-scorecard.scss']
})
export class PrintableScorecardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private matchService = inject(MatchService);
  private memberService = inject(MemberService);
  private scorecardService = inject(ScorecardService);
  private authService = inject(AuthService);

  matchId!: string;
  match: Match | null = null;
  scorecard: Scorecard | null = null;
  players: PrintablePlayer[] = [];
  loading = false;

  ngOnInit(): void {
    this.matchId = this.route.snapshot.params['id'];
    console.log('Printable scorecard initialized for match ID:', this.matchId);
    this.loadMatchData();
  }

  private loadMatchData(): void {
    this.loading = true;
    
    this.matchService.getById(this.matchId).subscribe({
      next: (response: any) => {
        console.log('Raw match service response for printable:', response);
        
        // Handle different response formats
        const match = response?.match || response;
        
        if (!match) {
          console.error('No match data in response:', response);
          this.snackBar.open('Match not found', 'Close', { duration: 3000 });
          this.loading = false;
          return;
        }
        
        console.log('Match loaded for printable scorecard:', match);
        console.log('Match scorecardId:', match.scorecardId);
        console.log('Match scorecardId type:', typeof match.scorecardId);
        
        this.match = match;
        
        // Check for scorecardId - handle both string and object cases
        const scorecardId = match.scorecardId;
        let hasScorecard = false;
        let finalScorecardId = '';
        
        if (typeof scorecardId === 'string' && scorecardId.trim() !== '') {
          hasScorecard = true;
          finalScorecardId = scorecardId.trim();
        } else if (typeof scorecardId === 'object' && scorecardId?._id) {
          hasScorecard = true;
          finalScorecardId = scorecardId._id;
        }
        
        console.log('Has scorecard:', hasScorecard);
        console.log('Final scorecard ID:', finalScorecardId);
        
        if (!hasScorecard) {
          console.error('Match has no scorecardId:', match);
          this.snackBar.open('No scorecard assigned to this match', 'Close', { duration: 3000 });
          this.loading = false;
          return;
        }

        // Load scorecard and members in parallel
        forkJoin({
          scorecard: this.scorecardService.getById(finalScorecardId),
          members: this.memberService.getAll()
        }).subscribe({
          next: ({ scorecard, members }) => {
            console.log('Raw scorecard response:', scorecard);
            
            // Handle different scorecard response formats
            const finalScorecard = scorecard?.scorecard || scorecard;
            
            // Parse string data if arrays are missing
            this.parseStringData(finalScorecard);
            
            this.scorecard = finalScorecard;
            
            console.log('Final scorecard data:', finalScorecard);
            console.log('Scorecard pars:', finalScorecard?.pars);
            console.log('Scorecard hCaps:', finalScorecard?.hCaps);
            console.log('Scorecard yards:', finalScorecard?.yards);
            console.log('Scorecard par:', finalScorecard?.par);
            console.log('All members loaded:', members);

            // Create printable players from match lineUps
            this.players = match.lineUps?.map((memberId: any) => {
              const member = members.find((m: any) => m._id === memberId);
              if (member) {
                return {
                  member,
                  handicap: this.calculateCourseHandicap(member.usgaIndex || 0)
                };
              }
              return null;
            }).filter(Boolean) as PrintablePlayer[] || [];

            console.log('Printable players created:', this.players);
            
            // Validate scorecard data completeness
            this.validateScorecardData();
            
            this.loading = false;
          },
          error: (error: any) => {
            console.error('Error loading scorecard/members for printable:', error);
            console.error('Attempted scorecard ID:', finalScorecardId);
            this.snackBar.open('Error loading scorecard data', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      },
      error: (error: any) => {
        console.error('Error loading match for printable scorecard:', error);
        this.snackBar.open('Error loading match data', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  calculateCourseHandicap(usgaIndex: number): number {
    if (!this.scorecard?.slope) return 0;
    return Math.round((usgaIndex * this.scorecard.slope) / 113);
  }

  getParForHole(holeIndex: number): number {
    const par = this.scorecard?.pars?.[holeIndex] || 4;
    if (holeIndex === 0) { // Debug first hole only to avoid spam
      console.log(`Par for hole ${holeIndex + 1}:`, par, 'from pars array:', this.scorecard?.pars);
    }
    return par;
  }

  getHoleHandicap(holeIndex: number): number {
    const handicap = this.scorecard?.hCaps?.[holeIndex] || 0;
    if (holeIndex === 0) { // Debug first hole only
      console.log(`Handicap for hole ${holeIndex + 1}:`, handicap, 'from hCaps array:', this.scorecard?.hCaps);
    }
    return handicap;
  }

  getYardage(holeIndex: number): number {
    const yardage = this.scorecard?.yards?.[holeIndex] || 0;
    if (holeIndex === 0) { // Debug first hole only
      console.log(`Yardage for hole ${holeIndex + 1}:`, yardage, 'from yards array:', this.scorecard?.yards);
    }
    return yardage;
  }

  getCoursePar(): number {
    if (this.scorecard?.par) {
      return this.scorecard.par;
    }
    if (this.scorecard?.pars && Array.isArray(this.scorecard.pars)) {
      return this.scorecard.pars.reduce((sum: number, par: number) => sum + (par || 4), 0);
    }
    return 72; // Default
  }

  getFrontNinePar(): number {
    if (this.scorecard?.pars && Array.isArray(this.scorecard.pars)) {
      return this.scorecard.pars.slice(0, 9).reduce((sum: number, par: number) => sum + (par || 4), 0);
    }
    return 36; // Default
  }

  getBackNinePar(): number {
    if (this.scorecard?.pars && Array.isArray(this.scorecard.pars)) {
      return this.scorecard.pars.slice(9, 18).reduce((sum: number, par: number) => sum + (par || 4), 0);
    }
    return 36; // Default
  }

  getFrontNineYards(): number {
    if (this.scorecard?.yards && Array.isArray(this.scorecard.yards)) {
      return this.scorecard.yards.slice(0, 9).reduce((sum: number, yards: number) => sum + (yards || 0), 0);
    }
    return 0;
  }

  getBackNineYards(): number {
    if (this.scorecard?.yards && Array.isArray(this.scorecard.yards)) {
      return this.scorecard.yards.slice(9, 18).reduce((sum: number, yards: number) => sum + (yards || 0), 0);
    }
    return 0;
  }

  getTotalYards(): number {
    if (this.scorecard?.yards && Array.isArray(this.scorecard.yards)) {
      return this.scorecard.yards.reduce((sum: number, yards: number) => sum + (yards || 0), 0);
    }
    return 0;
  }

  private parseStringData(scorecard: any): void {
    if (!scorecard) return;
    
    // Parse par data from string if arrays are missing
    if ((!scorecard.pars || !Array.isArray(scorecard.pars)) && scorecard.parInputString) {
      console.log('Parsing par data from string:', scorecard.parInputString);
      scorecard.pars = this.parseNumberString(scorecard.parInputString);
    }
    
    // Parse handicap data from string if arrays are missing
    if ((!scorecard.hCaps || !Array.isArray(scorecard.hCaps)) && scorecard.hCapInputString) {
      console.log('Parsing handicap data from string:', scorecard.hCapInputString);
      scorecard.hCaps = this.parseNumberString(scorecard.hCapInputString);
    }
    
    // Parse yardage data from string if arrays are missing
    if ((!scorecard.yards || !Array.isArray(scorecard.yards)) && scorecard.yardsInputString) {
      console.log('Parsing yardage data from string:', scorecard.yardsInputString);
      scorecard.yards = this.parseNumberString(scorecard.yardsInputString);
    }
  }
  
  private parseNumberString(inputString: string): number[] {
    if (!inputString) return [];
    
    // Handle different possible formats: comma-separated, space-separated, etc.
    const numbers = inputString
      .split(/[,\s\t]+/) // Split on comma, space, or tab
      .map(str => str.trim())
      .filter(str => str.length > 0)
      .map(str => parseInt(str, 10))
      .filter(num => !isNaN(num));
    
    console.log('Parsed numbers from string:', numbers);
    return numbers;
  }

  private validateScorecardData(): void {
    if (!this.scorecard) {
      console.warn('No scorecard data available');
      return;
    }
    
    const warnings = [];
    
    if (!this.scorecard.pars || !Array.isArray(this.scorecard.pars) || this.scorecard.pars.length !== 18) {
      warnings.push('Par data is missing or incomplete');
    }
    
    if (!this.scorecard.hCaps || !Array.isArray(this.scorecard.hCaps) || this.scorecard.hCaps.length !== 18) {
      warnings.push('Handicap data is missing or incomplete');
    }
    
    if (!this.scorecard.yards || !Array.isArray(this.scorecard.yards) || this.scorecard.yards.length !== 18) {
      warnings.push('Yardage data is missing or incomplete');
    }
    
    if (warnings.length > 0) {
      console.warn('Scorecard data validation warnings:', warnings);
      console.warn('Available scorecard properties:', Object.keys(this.scorecard));
    } else {
      console.log('Scorecard data validation passed - all arrays present');
    }
  }

  goBack(): void {
    this.router.navigate(['/matches']);
  }

  getPlayerGroup(startIndex: number, endIndex: number): any[] {
    return this.players.slice(startIndex, endIndex);
  }

  getEmptyRows(startIndex: number, endIndex: number): any[] {
    const playerCount = this.getPlayerGroup(startIndex, endIndex).length;
    const maxPlayersPerCard = 4;
    const emptyRowsNeeded = Math.max(0, maxPlayersPerCard - playerCount);
    return new Array(emptyRowsNeeded).fill(null);
  }

  getPageGroups(): any[][] {
    // Group players into pages of 4 players each
    const pageGroups: any[][] = [];
    const playersPerPage = 4;
    
    for (let i = 0; i < this.players.length; i += playersPerPage) {
      const group = this.players.slice(i, i + playersPerPage);
      pageGroups.push(group);
    }
    
    // If no players, still create one empty group for the template
    if (pageGroups.length === 0) {
      pageGroups.push([]);
    }
    
    return pageGroups;
  }

  getEmptyRowsForGroup(pageGroup: any[]): any[] {
    const maxPlayersPerCard = 4;
    const emptyRowsNeeded = Math.max(0, maxPlayersPerCard - pageGroup.length);
    return new Array(emptyRowsNeeded).fill(null);
  }

  getPlayingHandicap(player: PrintablePlayer): number {
    // Return the player's handicap for this course/match
    return player.handicap || 0;
  }

  getFormattedPlayerName(player: PrintablePlayer): string {
    const firstName = player.member.firstName || '';
    const lastName = player.member.lastName || '';
    const handicap = this.getPlayingHandicap(player);
    
    // Format as "LastName, F. (handicap)"
    const firstInitial = firstName.charAt(0).toUpperCase();
    return `${lastName}, ${firstInitial}. (${handicap})`;
  }

  async generateScorecard(): Promise<void> {
    if (!this.match || !this.scorecard || this.players.length === 0) {
      this.snackBar.open('Cannot generate scorecard - missing data', 'Close', { duration: 3000 });
      return;
    }

    try {
      // Create PDF with landscape orientation: 11" wide x 8.5" high to fit two scorecards side by side
      const pageWidth = 11 * 25.4; // 279.4mm
      const pageHeight = 8.5 * 25.4;  // 215.9mm
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pageWidth, pageHeight]
      });

      const pageGroups = this.getPageGroups();
      
      // Calculate dimensions for two scorecards stacked vertically
      const cardWidth = pageWidth; // Full width for each scorecard
      const cardHeight = 3.8 * 25.4; // 96.52mm per scorecard
      const spacing = 6; // 6mm spacing between cards
      const totalHeight = (2 * cardHeight) + spacing;
      const startY = (pageHeight - totalHeight) / 2; // Center vertically on page
      
      for (let pageIndex = 0; pageIndex < pageGroups.length; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        // Draw first scorecard on top
        this.drawScorecard(pdf, pageGroups[pageIndex], 0, startY, cardWidth, cardHeight);
        
        // Draw second identical scorecard below the first
        this.drawScorecard(pdf, pageGroups[pageIndex], 0, startY + cardHeight + spacing, cardWidth, cardHeight);
      }
      
      // Generate filename with match info
      const matchDate = this.match?.datePlayed ? 
        new Date(this.match.datePlayed).toLocaleDateString().replace(/[/\\?%*:|"<>]/g, '-') : 
        new Date().toLocaleDateString().replace(/[/\\?%*:|"<>]/g, '-');
      const courseName = this.scorecard?.name?.replace(/[/\\?%*:|"<>]/g, '-') || 'golf';
      const filename = `scorecard-${courseName}-${matchDate}.pdf`;
      
      // Open PDF in preview window with Download/Email/Print buttons
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open PDF in new window for preview
      const previewWindow = window.open(pdfUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
      
      if (previewWindow) {
        // Add download, email, and print buttons to the preview window
        previewWindow.addEventListener('load', () => {
          this.addPreviewControls(previewWindow, pdfBlob, filename);
        });
      }

      this.snackBar.open('Scorecard ready - choose Download, Email, or Print from the preview window!', 'Close', { duration: 5000 });

    } catch (error) {
      console.error('Error generating scorecard:', error);
      this.snackBar.open('Error generating scorecard', 'Close', { duration: 3000 });
    }
  }

  private drawScorecard(pdf: jsPDF, players: PrintablePlayer[], x: number, y: number, width: number, height: number): void {
    const margin = 2; // 2mm margin
    const startX = x + margin;
    const startY = y + margin;
    const contentWidth = width - (2 * margin);
    const contentHeight = height - (2 * margin);
    
    // Header
    this.drawHeader(pdf, startX, startY, contentWidth);
    
    // Table
    const tableY = startY + 8;
    this.drawTable(pdf, players, startX, tableY, contentWidth, contentHeight - 8);
  }

  private drawHeader(pdf: jsPDF, x: number, y: number, width: number): void {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    
    const courseName = this.scorecard?.name || 'Golf Course';
    const tees = this.scorecard?.courseTeeName || 'Championship Tees';
    const par = `Par ${this.getCoursePar()}`;
    const matchName = this.match?.name || '';
    const date = this.match?.datePlayed ? new Date(this.match.datePlayed).toLocaleDateString() : '';
    
    const headerText = `${courseName} • ${tees} • ${par} • ${matchName} • ${date}`;
    
    // Center the header text
    const textWidth = pdf.getTextWidth(headerText);
    const textX = x + (width - textWidth) / 2;
    
    pdf.text(headerText, textX, y + 4);
  }

  private drawTable(pdf: jsPDF, players: PrintablePlayer[], x: number, y: number, width: number, height: number): void {
    // Table dimensions optimized for 8.5" width
    const playerColWidth = 25;
    const totalColWidth = 8;
    const holeColWidth = (width - playerColWidth - (3 * totalColWidth) - 4) / 21; // 18 holes + margins
    
    // Move all columns 1/8" (3.175mm) to the right
    const tableStartX = x + 3.175;
    
    let currentY = y;
    
    // Draw header rows
    this.drawTableHeaders(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 24; // 3 header rows * 8mm each
    
    // Draw all 11 rows as specified: 3 headers + Member1 + Member2 + OneB + Match + Match + Member3 + Member4 + OneB
    // We already drew 3 header rows, now draw the 8 body rows
    
    // Row 4: Member1
    if (players.length > 0) {
      this.drawPlayerRow(pdf, players[0], players, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    } else {
      this.drawEmptyPlayerRow(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    }
    currentY += 8;
    
    // Row 5: Member2
    if (players.length > 1) {
      this.drawPlayerRow(pdf, players[1], players, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    } else {
      this.drawEmptyPlayerRow(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    }
    currentY += 8;
    
    // Row 6: One-ball (after first pair)
    this.drawMatchRow(pdf, 'One-ball', tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 8;
    
    // Row 7: Match
    this.drawMatchRow(pdf, 'Match', tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 8;
    
    // Row 8: Match
    this.drawMatchRow(pdf, 'Match', tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 8;
    
    // Row 9: Member3
    if (players.length > 2) {
      this.drawPlayerRow(pdf, players[2], players, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    } else {
      this.drawEmptyPlayerRow(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    }
    currentY += 8;
    
    // Row 10: Member4
    if (players.length > 3) {
      this.drawPlayerRow(pdf, players[3], players, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    } else {
      this.drawEmptyPlayerRow(pdf, tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    }
    currentY += 8;
    
    // Row 11: One-ball (after second pair)
    this.drawMatchRow(pdf, 'One-ball', tableStartX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY += 8;
  }

  private drawTableHeaders(pdf: jsPDF, x: number, y: number, playerColWidth: number, holeColWidth: number, totalColWidth: number): void {
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
    
    // Final columns
    const finalColumns = ['IN', 'TOT', 'NET', 'POST'];
    for (const col of finalColumns) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, col, true);
    }
    
    // PAR row
    currentX = x;
    currentY += 8;
    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'PAR');
    
    for (let hole = 0; hole < 18; hole++) {
      const par = this.getParForHole(hole);
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, par.toString(), true);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, this.getFrontNinePar().toString(), true);
      }
    }
    
    const parTotals = [this.getBackNinePar().toString(), this.getCoursePar().toString(), '-', '-'];
    for (const total of parTotals) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, total, true);
    }
    
    
    // HCP row
    currentX = x;
    currentY += 8;
    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'HCP');
    
    for (let hole = 0; hole < 18; hole++) {
      const hcp = this.getHoleHandicap(hole) || '-';
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, hcp.toString(), true);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
      }
    }
    
    // All totals are dashes for HCP row
    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
    }
  }

  private drawPlayerRow(pdf: jsPDF, player: PrintablePlayer, players: PrintablePlayer[], x: number, y: number, playerColWidth: number, holeColWidth: number, totalColWidth: number): void {
    let currentX = x;
    
    // Player name - bold
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    const playerName = this.getFormattedPlayerName(player);
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, playerName);
    
    // Reset to normal for score cells
    pdf.setFont('helvetica', 'normal');
    
    // Get lowest handicap in the group for team stroke calculation
    const lowestHandicap = this.getLowestHandicapInGroup(players);
    
    // Debug logging for first player only to avoid spam
    if (player === players[0]) {
      console.log('Team stroke calculation:', {
        lowestHandicap,
        playerHandicaps: players.map(p => this.getPlayingHandicap(p)),
        hole1Handicap: this.getHoleHandicap(0),
        hole2Handicap: this.getHoleHandicap(1)
      });
    }
    
    // Score cells for 18 holes
    for (let hole = 0; hole < 18; hole++) {
      const playerHandicap = this.getPlayingHandicap(player);
      const holeHandicap = this.getHoleHandicap(hole);
      
      // Individual stroke hole (small x in upper left)
      const getsIndividualStroke = this.playerGetsStrokeOnHole(playerHandicap, holeHandicap);
      
      // Team stroke hole (diagonal slash) - based on lowest handicap in group
      const getsTeamStroke = this.playerGetsStrokeOnHole(lowestHandicap, holeHandicap);
      
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, undefined, false, undefined, undefined, getsTeamStroke, getsIndividualStroke);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
      }
    }
    
    // Total columns (4 total columns: IN, TOT, NET, POST)
    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
    }
  }

  private getLowestHandicapInGroup(players: PrintablePlayer[]): number {
    if (players.length === 0) return 0;
    return Math.min(...players.map(p => this.getPlayingHandicap(p)));
  }

  private playerGetsStrokeOnHole(playerHandicap: number, holeHandicap: number): boolean {
    // Player gets a stroke if their handicap is greater than or equal to the hole's handicap
    // Hole handicaps are typically 1-18, where 1 is the hardest hole
    return playerHandicap >= holeHandicap && holeHandicap > 0;
  }

  private drawMatchRow(pdf: jsPDF, label: string, x: number, y: number, playerColWidth: number, holeColWidth: number, totalColWidth: number): void {
    let currentX = x;
    
    // Label with gray background for One-ball and Match rows - normal weight
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const isSpecialRow = label === 'One-ball' || label === 'Match';
    const backgroundColor = isSpecialRow ? '#E0E0E0' : undefined;
    
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, label, false, backgroundColor);
    
    // Score cells for 18 holes with gray background
    for (let hole = 0; hole < 18; hole++) {
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, undefined, false, backgroundColor);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, undefined, false, backgroundColor);
      }
    }
    
    // Total columns (4 total columns: IN, TOT, NET, POST) with gray background
    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, undefined, false, backgroundColor);
    }
  }

  private drawEmptyPlayerRow(pdf: jsPDF, x: number, y: number, playerColWidth: number, holeColWidth: number, totalColWidth: number): void {
    let currentX = x;
    
    // Player name placeholder - bold (since it represents a player position)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, '________________________');
    
    // Reset to normal for empty score cells
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    // Empty score cells
    for (let hole = 0; hole < 18; hole++) {
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
      }
    }
    
    // Total columns (4 total columns: IN, TOT, NET, POST)
    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
    }
  }

  private drawCell(pdf: jsPDF, x: number, y: number, width: number, height: number, text?: string, centered: boolean = false, backgroundColor?: string, textColor?: string, drawSlash: boolean = false, drawStrokeX: boolean = false): number {
    // Draw background if specified
    if (backgroundColor) {
      pdf.setFillColor(backgroundColor);
      pdf.rect(x, y, width, height, 'F'); // 'F' for filled rectangle
    }
    
    // Draw border
    pdf.rect(x, y, width, height);
    
    // Draw diagonal slash if requested (for team stroke holes)
    if (drawSlash) {
      pdf.setLineWidth(0.5);
      pdf.line(x, y + height, x + width, y); // Diagonal line from bottom-left to top-right
      pdf.setLineWidth(0.25); // Reset line width
    }

    // Draw small "x" in upper left if requested (for individual stroke holes)
    if (drawStrokeX) {
      const oldFontSize = pdf.getFontSize();
      pdf.setFontSize(5); // Very small font
      pdf.setFont('helvetica', 'normal');
      pdf.text('x', x + 0.5, y + 2); // Position in upper left corner
      pdf.setFontSize(oldFontSize); // Restore original font size
    }
    
    if (text) {
      // Set text color if specified
      if (textColor) {
        pdf.setTextColor(textColor);
      }
      
      let textX = x + 1; // Default left-aligned with 1mm padding
      
      if (centered) {
        const textWidth = pdf.getTextWidth(text);
        textX = x + (width - textWidth) / 2;
      }
      
      // Vertically center text in the taller cell
      const textY = y + (height / 2) + 1; // Center vertically with slight adjustment
      pdf.text(text, textX, textY);
      
      // Reset text color to black
      if (textColor) {
        pdf.setTextColor(0, 0, 0);
      }
    }
    
    return x + width;
  }

  private addPreviewControls(previewWindow: Window, pdfBlob: Blob, filename: string): void {
    // Wait a bit for PDF to load, then inject controls
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

      // Inject controls into preview window
      const controlsDiv = previewWindow.document.createElement('div');
      controlsDiv.innerHTML = controlsHtml;
      previewWindow.document.body.appendChild(controlsDiv);

      // Add event listeners
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
          this.emailScorecard(pdfBlob, filename);
        });
      }

      if (printBtn) {
        printBtn.addEventListener('click', () => {
          previewWindow.print();
        });
      }
    }, 1000);
  }

  private emailScorecard(pdfBlob: Blob, filename: string): void {
    // Get match and course info for email
    const courseName = this.scorecard?.name || 'Golf Course';
    const matchName = this.match?.name || 'Match';
    const matchDate = this.match?.datePlayed ? 
      new Date(this.match.datePlayed).toLocaleDateString() : 
      new Date().toLocaleDateString();
    
    const subject = `Golf Scorecard - ${courseName} - ${matchDate}`;
    const body = `Please find attached the scorecard for ${matchName} at ${courseName} on ${matchDate}.\n\nPlayers:\n${this.players.map(p => `• ${p.member.firstName} ${p.member.lastName} (${p.handicap})`).join('\n')}\n\nGenerated on ${new Date().toLocaleDateString()}`;
    
    // Option 1: Try modern Web Share API if available (works on mobile/some desktop)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], filename, { type: 'application/pdf' })] })) {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      navigator.share({
        title: subject,
        text: body,
        files: [file]
      }).then(() => {
        this.snackBar.open('Scorecard shared successfully!', 'Close', { duration: 3000 });
      }).catch((error) => {
        console.error('Error sharing:', error);
        this.fallbackEmailMethod(subject, body, pdfBlob, filename);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      this.fallbackEmailMethod(subject, body, pdfBlob, filename);
    }
  }

  private fallbackEmailMethod(subject: string, body: string, pdfBlob: Blob, filename: string): void {
    // Download the PDF first
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show user-friendly dialog with options
    const emailOptions = [
      'Gmail: https://mail.google.com/mail/u/0/#inbox?compose=new',
      'Outlook: https://outlook.live.com/mail/0/inbox/id/compose',
      'Yahoo Mail: https://mail.yahoo.com/d/compose',
      'Or use your default email client below'
    ];

    const message = `PDF downloaded to your Downloads folder!\n\nTo email the scorecard:\n\n${emailOptions.join('\n\n')}\n\nSubject: ${subject}\n\nAttach the downloaded PDF file: ${filename}`;

    // Try to open default email client as well
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n[Please attach the downloaded PDF file: ' + filename + ']')}`;
    
    // Show comprehensive instructions
    if (confirm(message + '\n\nClick OK to open your default email client, or Cancel to handle manually.')) {
      window.open(mailtoLink);
    }

    this.snackBar.open(`PDF downloaded as: ${filename}. Check your Downloads folder to attach to email.`, 'Close', { duration: 10000 });
  }

}