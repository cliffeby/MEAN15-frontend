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
    players: PrintablePlayer[] | PrintablePlayer[][], 
    options: PdfGenerationOptions = {}
  ): Promise<void> {
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
    const matchName = this.formatterService.formatMatchTitle(match.course.name, match.description);
    const dateText = `Date: ${this.formatterService.formatDateForDisplay(match.teeTime)}`;
    const dateWidth = pdf.getTextWidth(dateText);

    // Calculate layout
    const startX = 6.35; // 0.25 inches in mm
    const tableY = 10;

    // Debug: log received players/groups
    let groups: PrintablePlayer[][];
    if (Array.isArray(players[0])) {
      groups = players as PrintablePlayer[][];
      console.log('Scorecard PDF: Number of groups to print:', groups.length);
      groups.forEach((g, idx) => {
        console.log(`Group ${idx + 1}:`, g.map(p => `${p.member?.firstName || ''} ${p.member?.lastName || ''}`.trim() || p.member?._id));
      });
    } else {
      groups = [players as PrintablePlayer[]];
      console.log('Scorecard PDF: Single group, length:', groups[0].length);
      console.log('Group 1:', groups[0].map(p => `${p.member?.firstName || ''} ${p.member?.lastName || ''}`.trim() || p.member?._id));
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
    startY: number
  ): void {
    const playerColWidth = 32;
    const holeColWidth = 10;
    const totalColWidth = 10;

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
        // After the second player, insert three blank rows
        if (i === 1) {
          for (let r = 0; r < 3; r++) {
            let blankX = startX;
            const rowLabel = r === 0 ? 'One Ball' : '+/-';
            const backgroundColor = r === 0 ? undefined : '#D3D3D3'; // Light gray for +/- rows
            blankX = this.drawCell(pdf, blankX, currentY, playerColWidth, 8, rowLabel, false, backgroundColor);
            for (let h = 0; h < 18; h++) {
              blankX = this.drawCell(pdf, blankX, currentY, holeColWidth, 8, '', false, backgroundColor); // No numbers for +/- rows
              if (h === 8) {
                blankX = this.drawCell(pdf, blankX, currentY, totalColWidth, 8, '', false, backgroundColor);
              }
            }
            for (let t = 0; t < 4; t++) {
              blankX = this.drawCell(pdf, blankX, currentY, totalColWidth, 8, '', false, backgroundColor);
            }
            currentY += 8;
          }
        }
        // After the fourth player, insert one blank row
        if (i === 3) {
          let blankX = startX;
          blankX = this.drawCell(pdf, blankX, currentY, playerColWidth, 8, 'One Ball');
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
      }
    }
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
      // Individual strokes (x's)
      const strokeCount = this.handicapService.getStrokeCountOnHole(playerHandicap, holeHandicap);
      // Differential strokes (slashes)
      const lowestHandicapStrokeCount = this.handicapService.getStrokeCountOnHole(lowestHandicap, holeHandicap);
      const differentialStrokeCount = Math.max(0, strokeCount - lowestHandicapStrokeCount);
      currentX = this.drawCell(pdf, currentX, y, holeColWidth, 8, undefined, false, undefined, undefined, strokeCount, differentialStrokeCount);
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
    strokeCount: number = 0, 
    differentialStrokeCount: number = 0
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