import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import { PrintablePlayer } from '../models/printable-player.interface';
import { ScorecardData, MatchData, PdfGenerationOptions } from '../models/scorecard.interface';
import { HandicapCalculationService } from './handicap-calculation.service';
import { PrintPreviewService } from './print-preview.service';
import { ScorecardFormatterService } from './scorecard-formatter.service';
import { getMatchCourseName } from '../utils/score-entry-utils';
import { calculateOneBall, formatOneBallValue, OneBallResult } from '../utils/one-ball.utils';
import { calculateFourballNassau, NassauStatus } from '../utils/nassau-fourball.utils';

@Injectable({
  providedIn: 'root'
})
export class ScorecardPdfService {
  private handicapService = inject(HandicapCalculationService);
  private printService = inject(PrintPreviewService);
  private formatterService = inject(ScorecardFormatterService);

  constructor() { }

  /**
   * Generate a complete scorecard PDF
   */
  async generateScorecardPDF(
    match: MatchData,
    scorecard: ScorecardData,
    players: PrintablePlayer[] | (PrintablePlayer | null)[][],
    options: PdfGenerationOptions = {}
  ): Promise<string | undefined> {
    // Debug: log received players/groups
    console.log('generateScorecardPDF called. Players param:', Array.isArray(players[0]) ? (players as PrintablePlayer[][]).map(group => group.length) : (players as PrintablePlayer[]).length);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    const pageWidth = pdf.internal.pageSize.getWidth();
    // Match name (left)
    const matchName = this.formatterService.formatMatchTitle(match.course, match.description);
    const dateText = `Date: ${this.formatterService.formatDateForDisplay(match.teeTime)}`;
    const dateWidth = pdf.getTextWidth(dateText);

    // Calculate layout
    const startX = 6.35; // 0.25 inches in mm
    const tableY = 10;

    // Debug: log received players/groups
    let groups: (PrintablePlayer | null)[][];
    if (Array.isArray(players[0])) {
      groups = players as (PrintablePlayer | null)[][];
    } else {
      groups = [players as PrintablePlayer[]];
    }

    for (let i = 0; i < groups.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      const group = groups[i];
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      // First scorecard (top)
      pdf.text(matchName, 6.35, tableY);
      pdf.text(dateText, pageWidth - dateWidth - 6.35, tableY);
      this.drawTable(pdf, scorecard, group, startX, tableY + 5);

      // Duplicate scorecard (halfway down)
      const pageHeight = pdf.internal.pageSize.getHeight();
      const halfY = Math.floor(pageHeight / 2) +5;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(matchName, 6.35, halfY);
      pdf.text(dateText, pageWidth - dateWidth - 6.35, halfY);
      this.drawTable(pdf, scorecard, group, startX, halfY + 5);
    }

    // Generate filename and handle PDF output
    const filename = options.filename || this.printService.generateFilename(
      'scorecard', 
      match.course, 
      new Date(match.teeTime)
    );
    
    const base64 = options.returnBase64
      ? (pdf.output('datauristring') as string).split(',')[1]
      : undefined;

    if (options.openInNewWindow) {
      const pdfBlob = pdf.output('blob');
      const previewWindow = this.printService.openPdfPreview(pdfBlob, filename);

      if (!previewWindow) {
        // Fallback if popup blocked
        pdf.save(filename);
      }
    } else {
      pdf.save(filename);
    }

    return base64;
  }



  /**
   * Draw the complete scorecard table.
   * players is always treated as exactly 4 slots; null entries render as blank rows.
   * Slot 0 = A-player team1, slot 1 = B-player team1, slot 2 = A-player team2, slot 3 = B-player team2.
   * For a threesome: slot 1 = B-player, slot 2 = lone A, slot 3 = null (blank).
   */
  private drawTable(
    pdf: jsPDF,
    scorecard: ScorecardData,
    players: (PrintablePlayer | null)[],
    startX: number,
    startY: number
  ): void {
    const playerColWidth = 32;
    const holeColWidth = 10;
    const totalColWidth = 10;

    let currentY = startY;

    currentY = this.drawHoleNumbersRow(pdf, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY = this.drawParRow(pdf, scorecard, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY = this.drawHandicapRow(pdf, scorecard, startX, currentY, playerColWidth, holeColWidth, totalColWidth);

    const realPlayers = players.filter((p): p is PrintablePlayer => p !== null);
    const lowestHandicap = this.handicapService.getLowestHandicapInGroup(realPlayers);

    // Pre-compute one-ball (net better-ball) results for each two-man team.
    // Team 1 = slots 0 & 1, Team 2 = slots 2 & 3.
    // Pass lowestHandicap so differential strokes (the slash marks) are used.
    const oneBallTeam1 = calculateOneBall(
      players[0] ?? null,
      players[1] ?? null,
      scorecard,
      this.handicapService,
      lowestHandicap
    );
    const oneBallTeam2 = calculateOneBall(
      players[2] ?? null,
      players[3] ?? null,
      scorecard,
      this.handicapService,
      lowestHandicap
    );

    // Pre-compute Nassau (fourball match-play) status from the two teams' one-ball results.
    const nassau = calculateFourballNassau(oneBallTeam1, oneBallTeam2);

    for (let i = 0; i < 4; i++) {
      const player = i < players.length ? players[i] : null;

      if (player) {
        currentY = this.drawPlayerRow(pdf, player, realPlayers, lowestHandicap, scorecard, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
      } else {
        // Blank player slot (e.g. 4th slot in a threesome group)
        let blankX = startX;
        blankX = this.drawCell(pdf, blankX, currentY, playerColWidth, 8, '');
        for (let h = 0; h < 18; h++) {
          blankX = this.drawCell(pdf, blankX, currentY, holeColWidth, 8, '');
          if (h === 8) {
            blankX = this.drawCell(pdf, blankX, currentY, totalColWidth, 8, '');
          }
        }
        for (let t = 0; t < 4; t++) {
          blankX = this.drawCell(pdf, blankX, currentY, totalColWidth, 8, '');
        }
        currentY += 8;
      }

      // After slot 1 (2nd row): One Ball (Team 1) + Nassau row + blank +/- row
      if (i === 1) {
        currentY = this.drawOneBallRow(pdf, oneBallTeam1, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
        // First +/- row: Nassau fourball match-play status
        currentY = this.drawNassauRow(pdf, nassau, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
        // Second +/- row: 18-hole automatic press (blank until triggered)
        currentY = this.drawOverallPressRow(pdf, nassau, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
      }

      // After slot 3 (4th row): One Ball row (Team 2) at bottom
      if (i === 3) {
        currentY = this.drawOneBallRow(pdf, oneBallTeam2, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
      }
    }
  }

  /**
   * Draw the 18-hole automatic press row.
   * Cells are blank until the press activates (after the overall bet is closed out).
   * Once active, shows the cumulative press status per hole.
   * TOT column shows the final press value; OUT/IN/HCP/NET are blank.
   */
  private drawOverallPressRow(
    pdf: jsPDF,
    nassau: NassauStatus,
    x: number,
    y: number,
    playerColWidth: number,
    holeColWidth: number,
    totalColWidth: number
  ): number {
    const backgroundColor = '#D3D3D3';
    const baseFontSize = pdf.getFontSize();
    let currentX = x;
    const negColor = (v?: string): string | undefined => v?.startsWith('-') ? '#CC0000' : undefined;
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, 'Press', false, backgroundColor);
    for (let h = 0; h < 18; h++) {
      const val = nassau.overallPressHoles[h] ?? undefined;
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, val, true, backgroundColor, negColor(val), 0, 0, !!val);
      if (h === 8) {
        // OUT column: blank for the press row
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '', false, backgroundColor);
      }
    }
    const totVal = nassau.overallPressFinal ?? undefined;
    // IN: blank, TOT: press final, HCP: blank, NET: blank
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '',     false, backgroundColor);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, totVal, true,  backgroundColor, negColor(totVal), 0, 0, !!totVal);
    pdf.setFontSize(baseFontSize);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '', false, backgroundColor);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '', false, backgroundColor);
    return y + 8;
  }

  /**
   * Draw the Nassau fourball match-play status row with two-down press values.
   * Holes 1-9  show the cumulative front-nine bet status (+ any presses).
   * Holes 10-18 show the cumulative back-nine bet status (resets at hole 10).
   * OUT = front-nine final, IN = back-nine final, TOT = overall 18-hole final.
   * Combined press values (e.g. "+4/+2/0") use a smaller font to fit the cell.
   */
  private drawNassauRow(
    pdf: jsPDF,
    nassau: NassauStatus,
    x: number,
    y: number,
    playerColWidth: number,
    holeColWidth: number,
    totalColWidth: number
  ): number {
    const backgroundColor = '#D3D3D3';
    const baseFontSize = pdf.getFontSize();
    let currentX = x;
    const negColor = (v?: string): string | undefined => v?.startsWith('-') ? '#CC0000' : undefined;
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, 'Nassau', false, backgroundColor);
    for (let h = 0; h < 18; h++) {
      const val = nassau.holeStatus[h] ?? undefined;
      if (val?.includes('/')) pdf.setFontSize(5.5);
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, val, true, backgroundColor, negColor(val), 0, 0, !!val);
      pdf.setFontSize(baseFontSize);
      if (h === 8) {
        const outVal = nassau.frontNineStatus ?? undefined;
        if (outVal?.includes('/')) pdf.setFontSize(5.5);
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, outVal, true, backgroundColor, negColor(outVal), 0, 0, !!outVal);
        pdf.setFontSize(baseFontSize);
      }
    }
    const inVal  = nassau.backNineStatus  ?? undefined;
    const totVal = nassau.overallStatus   ?? undefined;
    if (inVal?.includes('/'))  pdf.setFontSize(5.5);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, inVal,  true, backgroundColor, negColor(inVal), 0, 0, !!inVal);
    pdf.setFontSize(baseFontSize);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, totVal, true, backgroundColor, negColor(totVal), 0, 0, !!totVal);
    pdf.setFontSize(baseFontSize);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '', false, backgroundColor);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '', false, backgroundColor);
    return y + 8;
  }

  /**
   * Draw a One Ball row showing net better-ball values relative to par for each hole.
   * OUT and IN cells show front/back nine totals; TOT shows the overall total.
   */
  private drawOneBallRow(
    pdf: jsPDF,
    result: OneBallResult,
    x: number,
    y: number,
    playerColWidth: number,
    holeColWidth: number,
    totalColWidth: number
  ): number {
    let currentX = x;
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, 'One Ball');

    // Track whether any score has been entered; only show cumulative once scoring starts.
    let hasStarted = false;
    let runningTotal = 0;
    const negColor = (v?: string): string | undefined => v?.startsWith('-') ? '#CC0000' : undefined;

    for (let h = 0; h < 18; h++) {
      const holeRel = result.holes[h]?.relToPar ?? null;
      if (holeRel !== null) {
        hasStarted = true;
        runningTotal += holeRel;
      }
      const val = hasStarted ? formatOneBallValue(runningTotal) : undefined;
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, val, true, undefined, negColor(val), 0, 0, !!val);
      if (h === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '');
      }
    }
    const totVal = formatOneBallValue(result.total);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '');
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, totVal, true, undefined, negColor(totVal), 0, 0, !!totVal);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '');
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, '');
    return y + 8;
  }

  /**
   * Draw hole numbers row
   */
  private drawHoleNumbersRow(
    pdf: jsPDF, 
    x: number, 
    y: number, 
    playerColWidth: number, 
    holeColWidth: number, 
    totalColWidth: number
  ): number {
    let currentX = x;
    const currentY = y;

    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'HOLE');
    pdf.setFontSize(7);

    for (let hole = 1; hole <= 9; hole++) {
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, hole.toString(), true, '#000000', '#FFFFFF');
      if (hole === 9) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, 'OUT', true, '#000000', '#FFFFFF');
      }
    }

    const backNineColumns = ['10', '11', '12', '13', '14', '15', '16', '17', '18', 'IN', 'TOT', 'HCP', 'NET'];
    for (const col of backNineColumns) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, col, true,  '#000000', '#FFFFFF');
    }

    return currentY + 8;
  }

  /**
   * Draw par row
   */
  private drawParRow(
    pdf: jsPDF, 
    scorecard: ScorecardData, 
    x: number, 
    y: number, 
    playerColWidth: number, 
    holeColWidth: number, 
    totalColWidth: number
  ): number {
    let currentX = x;
    const currentY = y;

    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'PAR');

    for (let hole = 0; hole < 9; hole++) {
      const par = scorecard.pars[hole] || 4;
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, par.toString(), true);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, this.handicapService.getFrontNinePar(scorecard).toString(), true);
      }
    }

    const backNineData = [4, 4, 4, 4, 4, 4, 4, 4, 4]; // Default back nine pars
    let total = this.handicapService.getFrontNinePar(scorecard);
    for (let hole = 9; hole < 18; hole++) {
      const par = scorecard.pars[hole] || 4;
      total += par;
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, par.toString(), true);
    }
    const backNineTotal = total - this.handicapService.getFrontNinePar(scorecard);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, backNineTotal.toString(), true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, total.toString(), true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);

    return currentY + 8;
  }

  /**
   * Draw rochIndex row
   */
  private drawHandicapRow(
    pdf: jsPDF, 
    scorecard: ScorecardData, 
    x: number, 
    y: number, 
    playerColWidth: number, 
    holeColWidth: number, 
    totalColWidth: number
  ): number {
    let currentX = x;
    const currentY = y;

    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'HCP');

    for (let hole = 0; hole < 9; hole++) {
      const hcp = this.handicapService.getHoleHandicap(scorecard, hole);
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, hcp.toString(), true);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
      }
    }

    // Back nine handicaps from scorecard data
    for (let hole = 9; hole < 18; hole++) {
      const hcp = this.handicapService.getHoleHandicap(scorecard, hole);
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, hcp.toString(), true);
    }
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);

    return currentY + 8;
  }

  /**
   * Draw a player row with stroke indicators
   */
  private drawPlayerRow(
    pdf: jsPDF,
    player: PrintablePlayer,
    players: PrintablePlayer[],
    lowestHandicap: number,
    scorecard: ScorecardData,
    x: number,
    y: number,
    playerColWidth: number,
    holeColWidth: number,
    totalColWidth: number
  ): number {
    let currentX = x;
    const playerName = this.formatterService.getFormattedPlayerName(player);

    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, playerName);

    // Pre-compute totals from existing scores if present
    const holeScores = player.scores || [];
    let frontNineTotal = 0;
    let backNineTotal = 0;
    let hasAnyScore = false;
    for (let h = 0; h < 18; h++) {
      const v = holeScores[h];
      if (v != null && v > 0) {
        hasAnyScore = true;
        if (h < 9) frontNineTotal += v; else backNineTotal += v;
      }
    }
    const grossTotal = frontNineTotal + backNineTotal;
    const netTotal = grossTotal - Math.round(player.rochIndex);

    for (let hole = 0; hole < 18; hole++) {
      const playerHandicap = player.rochIndex;
      const holeHandicap = this.handicapService.getHoleHandicap(scorecard, hole);
      const strokeCount = this.handicapService.getStrokeCountOnHole(playerHandicap, holeHandicap);
      const lowestHandicapStrokeCount = this.handicapService.getStrokeCountOnHole(lowestHandicap, holeHandicap);
      const differentialStrokeCount = Math.max(0, strokeCount - lowestHandicapStrokeCount);
      const scoreVal = holeScores[hole];
      const scoreText = (scoreVal != null && scoreVal > 0) ? scoreVal.toString() : undefined;
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, scoreText, true, undefined, undefined, strokeCount, differentialStrokeCount, false, !!scoreText);
      if (hole === 8) {
        const outText = hasAnyScore && frontNineTotal > 0 ? frontNineTotal.toString() : undefined;
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, outText, true, undefined, undefined, 0, 0, !!outText);
      }
    }

    // IN, TOT, HCP, NET
    const inText  = hasAnyScore && backNineTotal  > 0 ? backNineTotal.toString()  : undefined;
    const totText = hasAnyScore && grossTotal      > 0 ? grossTotal.toString()     : undefined;
    const hcpText = player.rochIndex > 0 ? Math.round(player.rochIndex).toString() : undefined;
    const netText = hasAnyScore && grossTotal > 0 ? netTotal.toString() : undefined;
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, inText,  true, undefined, undefined, 0, 0, !!inText);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, totText, true, undefined, undefined, 0, 0, false, false, !!totText);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, hcpText, true, undefined, undefined, 0, 0, false, false, !!hcpText);
    currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, netText, true, undefined, undefined, 0, 0, false, false, !!netText);

    return y + 8;
  }

  /**
   * Draw a single table cell with optional stroke indicators
   */
  private drawCell(
    pdf: jsPDF, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    text?: string, 
    centered: boolean = false, 
    backgroundColor?: string, 
    textColor?: string, 
    strokeCount: number = 0, 
    differentialStrokeCount: number = 0,
    bold: boolean = false,
    scoreStyle: boolean = false,
    totalStyle: boolean = false
  ): number {
    if (backgroundColor) {
      pdf.setFillColor(backgroundColor);
      pdf.rect(x, y, width, height, 'F');
    }
    
    pdf.rect(x, y, width, height);
    
    // Draw diagonal slashes for differential strokes
    if (differentialStrokeCount > 0) {
      pdf.setLineWidth(0.5);
      for (let i = 0; i < differentialStrokeCount; i++) {
        // Offset each slash slightly
        const offset = i * 2.5;
        pdf.line(x + offset, y + height, x + width - offset, y);
      }
      pdf.setLineWidth(0.25);
    }

    // Draw small "x" marks for individual stroke holes (can be multiple)
    if (strokeCount > 0) {
      const oldFontSize = pdf.getFontSize();
      pdf.setFontSize(5); // Very small font
      pdf.setFont('helvetica', 'normal');
      if (strokeCount === 1) {
        pdf.text('x', x + 0.5, y + 2);
      } else if (strokeCount === 2) {
        pdf.text('x', x + 0.5, y + 2);
        pdf.text('x', x + 2.5, y + 2);
      } else if (strokeCount >= 3) {
        pdf.setFontSize(6);
        pdf.text(strokeCount.toString(), x + 0.5, y + 2.5);
      }
      pdf.setFontSize(oldFontSize);
    }
    
    if (text) {
      if (textColor) {
        pdf.setTextColor(textColor);
      }

      const prevFontSize = pdf.getFontSize();
      if (totalStyle) {
        // Summary column (TOT/HCP/NET): auto-fit largest bold font that fills the cell
        pdf.setFont('helvetica', 'bold');
        let fs = 13;
        pdf.setFontSize(fs);
        while (fs > 5 && pdf.getTextWidth(text) > width - 1.5) {
          fs -= 0.5;
          pdf.setFontSize(fs);
        }
        const tw = pdf.getTextWidth(text);
        const textX = x + (width - tw) / 2;
        const textY = y + (height / 2) + 1.5;
        pdf.text(text, textX, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(prevFontSize);
      } else if (scoreStyle) {
        // Score digits: bold, slightly larger, left-centre positioning
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(prevFontSize + 3);
        const textX = x + 1.5;
        const textY = y + (height / 2) + 1.5;
        pdf.text(text, textX, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(prevFontSize);
      } else {
        if (bold) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(prevFontSize + 1.5);
        }

        let textX = x + 1;
        if (centered) {
          const textWidth = pdf.getTextWidth(text);
          textX = x + (width - textWidth) / 2;
        }

        const textY = y + (height / 2) + 1;
        pdf.text(text, textX, textY);

        if (bold) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(prevFontSize);
        }
      }
      if (textColor) {
        pdf.setTextColor(0, 0, 0);
      }
    }
    
    return x + width;
  }

}