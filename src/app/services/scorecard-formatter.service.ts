import { Injectable } from '@angular/core';
import { PrintablePlayer } from '../models/printable-player.interface';

@Injectable({
  providedIn: 'root'
})
export class ScorecardFormatterService {

  constructor() { }

  /**
   * Format player name for display on scorecard
   */
  getFormattedPlayerName(player: PrintablePlayer): string {
    const firstName = player.member.firstName || '';
    const lastName = player.member.lastName || '';
    const rochIndex = player.rochIndex;
    const teeAbreviation = player.teeAbreviation || '';
    
    
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastNameTruncated = lastName.length > 8 ? lastName.substring(0, 8) : lastName;
    
    return `${firstInitial}. ${lastNameTruncated} (${rochIndex}) ${teeAbreviation}`;
  }

  /**
   * Format match title for PDF header
   */
  formatMatchTitle(courseName: string, matchDescription: string): string {
    return `${courseName} - ${matchDescription}`;
  }

  /**
   * Format date for display
   */
  formatDateForDisplay(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  /**
   * Format tee information
   */
  formatTeeInfo(teeName: string): string {
    return `Tees: ${teeName}`;
  }

  /**
   * Format filename-safe string
   */
  formatForFilename(input: string): string {
    return input.replace(/[/\\?%*:|"<>]/g, '-');
  }

  /**
   * Format par information
   */
  formatPar(par: number): string {
    return `Par ${par}`;
  }

  /**
   * Format hole number for display
   */
  formatHoleNumber(holeNumber: number): string {
    return holeNumber.toString();
  }

  /**
   * Format yardage for display
   */
  formatYardage(yards: number): string {
    return yards > 0 ? yards.toString() : '-';
  }

  /**
   * Format rochIndex for display
   */
  formatHandicap(rochIndex: number): string {
    return rochIndex > 0 ? rochIndex.toString() : '-';
  }
}