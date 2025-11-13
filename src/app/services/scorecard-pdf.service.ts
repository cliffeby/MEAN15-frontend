import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import { PrintablePlayer } from '../models/printable-player.interface';
import { ScorecardData, MatchData, PdfGenerationOptions } from '../models/scorecard.interface';
import { HandicapCalculationService } from './handicap-calculation.service';
import { PrintPreviewService } from './print-preview.service';
import { ScorecardFormatterService } from './scorecard-formatter.service';

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
    players: PrintablePlayer[], 
    options: PdfGenerationOptions = {}
  ): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);

    // Title
    const title = this.formatterService.formatMatchTitle(match.course.name, match.description);
    const titleWidth = pdf.getTextWidth(title);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const titleX = (pageWidth - titleWidth) / 2;
    pdf.text(title, titleX, 15);

    // Date
    pdf.setFontSize(12);
    const dateText = `Date: ${this.formatterService.formatDateForDisplay(match.teeTime)}`;
    const dateWidth = pdf.getTextWidth(dateText);
    const dateX = (pageWidth - dateWidth) / 2;
    pdf.text(dateText, dateX, 25);

    // Tee information
    pdf.setFontSize(10);
    const teeText = this.formatterService.formatTeeInfo(scorecard.tees);
    const teeWidth = pdf.getTextWidth(teeText);
    const teeX = (pageWidth - teeWidth) / 2;
    pdf.text(teeText, teeX, 32);

    // Calculate layout
    const contentWidth = 270;
    const startX = (pageWidth - contentWidth) / 2;
    const tableY = 40;

    // Draw the scorecard table
    this.drawTable(pdf, scorecard, players, startX, tableY, contentWidth);

    // Generate filename and handle PDF output
    const filename = options.filename || this.printService.generateFilename(
      'scorecard', 
      match.course.name, 
      new Date(match.teeTime)
    );
    
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
  }



  /**
   * Draw the complete scorecard table
   */
  private drawTable(
    pdf: jsPDF, 
    scorecard: ScorecardData, 
    players: PrintablePlayer[], 
    startX: number, 
    startY: number, 
    contentWidth: number
  ): void {
    const playerColWidth = 40;
    const holeColWidth = 12;
    const totalColWidth = 16;

    let currentY = startY;

    // Draw hole numbers row
    currentY = this.drawHoleNumbersRow(pdf, startX, currentY, playerColWidth, holeColWidth, totalColWidth);

    // Draw par row
    currentY = this.drawParRow(pdf, scorecard, startX, currentY, playerColWidth, holeColWidth, totalColWidth);

    // Draw handicap row
    currentY = this.drawHandicapRow(pdf, scorecard, startX, currentY, playerColWidth, holeColWidth, totalColWidth);

    // Draw player rows
    const lowestHandicap = this.handicapService.getLowestHandicapInGroup(players);
    
    for (let i = 0; i < Math.min(players.length, 4); i++) {
      if (players[i]) {
        currentY = this.drawPlayerRow(pdf, players[i], players, lowestHandicap, scorecard, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
      }
    }

    // Draw match rows for additional space
    currentY = this.drawMatchRow(pdf, 'Best Ball', startX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY = this.drawMatchRow(pdf, 'Alt Shot', startX, currentY, playerColWidth, holeColWidth, totalColWidth);
    currentY = this.drawMatchRow(pdf, 'Individual', startX, currentY, playerColWidth, holeColWidth, totalColWidth);

    // Draw signature row
    this.drawSignatureRow(pdf, startX, currentY, playerColWidth, holeColWidth, totalColWidth);
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
    let currentY = y;

    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'HOLE');

    for (let hole = 1; hole <= 9; hole++) {
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, hole.toString(), true, '#000000', '#FFFFFF');
      if (hole === 9) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, 'OUT', true);
      }
    }

    const backNineColumns = ['10', '11', '12', '13', '14', '15', '16', '17', '18', 'IN', 'TOT', 'HCP', 'NET'];
    for (const col of backNineColumns) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, col, true);
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
    let currentY = y;

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
    for (const par of backNineData) {
      total += par;
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, par.toString(), true);
    }
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, (total - this.handicapService.getFrontNinePar(scorecard)).toString(), true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, total.toString(), true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
    currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);

    return currentY + 8;
  }

  /**
   * Draw handicap row
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
    let currentY = y;

    currentX = this.drawCell(pdf, currentX, currentY, playerColWidth, 8, 'HCP');

    for (let hole = 0; hole < 9; hole++) {
      const hcp = this.handicapService.getHoleHandicap(scorecard, hole);
      currentX = this.drawCell(pdf, currentX, currentY, holeColWidth, 8, hcp.toString(), true);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, '-', true);
      }
    }

    // Back nine handicaps (using a default pattern)
    const backNineHcps = [2, 4, 6, 8, 10, 12, 14, 16, 18];
    for (const hcp of backNineHcps) {
      currentX = this.drawCell(pdf, currentX, currentY, totalColWidth, 8, hcp.toString(), true);
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

    for (let hole = 0; hole < 18; hole++) {
      const playerHandicap = player.handicap;
      const holeHandicap = this.handicapService.getHoleHandicap(scorecard, hole);
      
      // Individual stroke hole (small x in upper left) - can be multiple strokes
      const individualStrokeCount = this.handicapService.getStrokeCountOnHole(playerHandicap, holeHandicap);
      
      // Team stroke hole (diagonal slash) - based on handicap difference from lowest player
      const getsTeamStroke = this.handicapService.playerGetsTeamStroke(player, lowestHandicap, holeHandicap);
      
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, undefined, false, undefined, undefined, getsTeamStroke, individualStrokeCount);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
      }
    }

    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
    }

    return y + 8;
  }

  /**
   * Draw a match row (Best Ball, Alt Shot, etc.)
   */
  private drawMatchRow(
    pdf: jsPDF, 
    label: string, 
    x: number, 
    y: number, 
    playerColWidth: number, 
    holeColWidth: number, 
    totalColWidth: number
  ): number {
    let currentX = x;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const backgroundColor = '#E0E0E0';
    
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, label, false, backgroundColor);

    for (let hole = 0; hole < 9; hole++) {
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, undefined, false, backgroundColor);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, undefined, false, backgroundColor);
      }
    }

    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8, undefined, false, backgroundColor);
    }

    return y + 8;
  }

  /**
   * Draw signature row
   */
  private drawSignatureRow(
    pdf: jsPDF, 
    x: number, 
    y: number, 
    playerColWidth: number, 
    holeColWidth: number, 
    totalColWidth: number
  ): number {
    let currentX = x;
    
    currentX = this.drawCell(pdf, currentX, y, playerColWidth, 8, '________________________');

    for (let hole = 0; hole < 9; hole++) {
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8);
      if (hole === 8) {
        currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
      }
    }

    for (let i = 0; i < 4; i++) {
      currentX = this.drawCell(pdf, currentX, y, totalColWidth, 8);
    }

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
    drawSlash: boolean = false, 
    strokeCount: number = 0
  ): number {
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

}