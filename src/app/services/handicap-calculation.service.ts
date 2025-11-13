import { Injectable } from '@angular/core';
import { PrintablePlayer } from '../models/printable-player.interface';
import { ScorecardData } from '../models/scorecard.interface';

@Injectable({
  providedIn: 'root'
})
export class HandicapCalculationService {

  constructor() { }

  /**
   * Get the lowest handicap in a group of players
   */
  getLowestHandicapInGroup(players: PrintablePlayer[]): number {
    if (players.length === 0) return 0;
    return Math.min(...players.map(p => p.handicap));
  }

  /**
   * Check if a player gets a stroke on a specific hole
   */
  playerGetsStrokeOnHole(playerHandicap: number, holeHandicap: number): boolean {
    return playerHandicap >= holeHandicap && holeHandicap > 0;
  }

  /**
   * Calculate how many strokes a player gets on a specific hole
   * For handicaps > 18, players get multiple strokes on harder holes
   */
  getStrokeCountOnHole(playerHandicap: number, holeHandicap: number): number {
    if (holeHandicap <= 0) return 0;
    
    const strokesFromFirstRound = playerHandicap >= holeHandicap ? 1 : 0;
    const strokesFromSecondRound = playerHandicap >= (holeHandicap + 18) ? 1 : 0;
    
    return strokesFromFirstRound + strokesFromSecondRound;
  }

  /**
   * Calculate team stroke for a player based on group's lowest handicap
   * Player gets team stroke if (their handicap - lowest handicap) >= hole handicap
   */
  playerGetsTeamStroke(
    player: PrintablePlayer, 
    lowestHandicap: number, 
    holeHandicap: number
  ): boolean {
    const handicapDifference = player.handicap - lowestHandicap;
    return handicapDifference > 0 && handicapDifference >= holeHandicap;
  }

  /**
   * Get hole handicap from scorecard data
   */
  getHoleHandicap(scorecard: ScorecardData, holeIndex: number): number {
    if (!scorecard?.hCaps || holeIndex < 0 || holeIndex >= scorecard.hCaps.length) {
      return 1;
    }
    return scorecard.hCaps[holeIndex];
  }

  /**
   * Calculate course handicap from USGA index
   */
  calculateCourseHandicap(usgaIndex: number, slope: number = 113): number {
    if (!slope) return 0;
    return Math.round((usgaIndex * slope) / 113);
  }

  /**
   * Calculate front nine par total
   */
  getFrontNinePar(scorecard: ScorecardData): number {
    if (!scorecard?.pars) return 36;
    return scorecard.pars.slice(0, 9).reduce((sum, par) => sum + (par || 4), 0);
  }

  /**
   * Calculate total par for the course
   */
  getTotalPar(scorecard: ScorecardData): number {
    if (!scorecard?.pars) return 72;
    return scorecard.pars.reduce((sum, par) => sum + (par || 4), 0);
  }
}