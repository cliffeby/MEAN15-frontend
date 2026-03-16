import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';

import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { ScorecardService } from '../../services/scorecardService';
import { Scorecard } from '../../models/scorecard.interface';
import { ScorecardPdfService } from '../../services/scorecard-pdf.service';
import { HandicapCalculationService } from '../../services/handicap-calculation.service';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { PrintablePlayer } from '../../models/printable-player.interface';
import { MatchData, ScorecardData } from '../../models/scorecard.interface';
import { getMemberScorecard } from '../../utils/score-entry-utils';
import { getGroupSizes } from '../../utils/pair-utils';

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
  private pdfService = inject(ScorecardPdfService);
  private handicapService = inject(HandicapCalculationService);

  matchId!: string;
  match: Match | null = null;
  scorecard: Scorecard | null = null;
  players: PrintablePlayer[] = [];
  loading = false;

  ngOnInit(): void {
    this.matchId = this.route.snapshot.params['id'];
  
    this.loadMatchData();
  }

  private loadMatchData(): void {
    this.loading = true;
    
    this.matchService.getById(this.matchId).subscribe({
      next: (response: any) => {
        
        // Handle different response formats
        const match = response?.match || response;
        
        if (!match) {
          console.error('No match data in response:', response);
          this.snackBar.open('Match not found', 'Close', { duration: 3000 });
          this.loading = false;
          return;
        }
        

        
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
        
        
        if (!hasScorecard) {
          console.error('Match has no scorecardId:', match);
          this.snackBar.open('No scorecard found for this match', 'Close', { duration: 3000 });
          this.loading = false;
          return;
        }

        // Load both scorecard and members data
        forkJoin({
          scorecard: this.scorecardService.getById(finalScorecardId),
          members: this.memberService.getAll(),
          allScorecards: this.scorecardService.getAll()
        }).subscribe({
          next: (data) => {
            console.log('Forkjoin response:', data);
            
            if (data.scorecard) {
              console.log('Scorecard loaded:', data.scorecard);
              
              // Handle different response formats for scorecard
              const finalScorecard = data.scorecard.scorecard || data.scorecard;
              console.log('Final scorecard after unwrapping:', finalScorecard);
              
              this.parseStringData(finalScorecard);
              this.scorecard = finalScorecard;
              
              const members = data.members || [];
              const scorecardList: Scorecard[] = data.allScorecards?.scorecards || data.allScorecards || [];
              console.log('Members loaded:', members?.length || 0, 'members');
              
              // Build players array — support both field names (lineUps = current, members = legacy)
              const lineupMemberIds: string[] = Array.isArray(match.lineUps)
                ? match.lineUps
                : Array.isArray(match.members) ? match.members : [];

              if (lineupMemberIds.length > 0) {
                this.players = lineupMemberIds.map((memberId: string) => {
                  const member = members.find((m: any) => m._id === memberId);
                  if (member) {
                    const memberScorecard = getMemberScorecard(finalScorecard.course, member.scorecardsId || [], scorecardList);
                    return {
                      member,
                      rochIndex: this.handicapService.calculateCourseHandicap(member.rochIndexB4Round || 0, memberScorecard?.slope || 113),
                      teeAbreviation: memberScorecard?.teeAbreviation || '',
                    };
                  }
                  return null;
                }).filter(p => p !== null) as PrintablePlayer[];
                
                console.log('Players built:', this.players.length);
              }
              
              // Generate PDF immediately
              this.generateScorecard();
              
            } else {
              this.snackBar.open('Scorecard not found', 'Close', { duration: 3000 });
            }
            
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading data:', error);
            this.snackBar.open('Error loading data', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading match:', error);
        this.snackBar.open('Error loading match', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }





  private parseStringData(scorecard: any): void {
    if (!scorecard) return;
    
    // Parse par data from string if arrays are missing
    if ((!scorecard.pars || !Array.isArray(scorecard.pars)) && scorecard.parInputString) {
      console.log('Parsing par data from string:', scorecard.parInputString);
      scorecard.pars = scorecard.parInputString.split(',').map((p: string) => parseInt(p.trim(), 10)).filter((p: number) => !isNaN(p));
      console.log('Parsed pars:', scorecard.pars);
    }
    
    // Parse rochIndex data from string if arrays are missing
    if ((!scorecard.hCaps || !Array.isArray(scorecard.hCaps)) && scorecard.hCapInputString) {
      console.log('Parsing rochIndex data from string:', scorecard.hCapInputString);
      scorecard.hCaps = scorecard.hCapInputString.split(',').map((h: string) => parseInt(h.trim(), 10)).filter((h: number) => !isNaN(h));
      console.log('Parsed hCaps:', scorecard.hCaps);
    }
    
    // Parse distance data from string if arrays are missing
    if ((!scorecard.yards || !Array.isArray(scorecard.yards)) && scorecard.distanceInputString) {
      console.log('Parsing distance data from string:', scorecard.distanceInputString);
      scorecard.yards = scorecard.distanceInputString.split(',').map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d));
      console.log('Parsed yards:', scorecard.yards);
    }
  }



  async generateScorecard(): Promise<void> {
      console.log('generateScorecard() called');
    if (!this.match || !this.scorecard || this.players.length === 0) {
      this.snackBar.open('Cannot generate scorecard - missing data', 'Close', { duration: 3000 });
      return;
    }

    // Debug: log players before grouping
    if (this.players && this.players.length) {
      console.log('Players before grouping:', this.players.length, this.players.map(p => p.member && (p.member.firstName + ' ' + p.member.lastName)));
    } else {
      console.warn('No players found before grouping:', this.players);
    }

    // Build print groups from foursomeIdsTEMP, ordering A before B within each team.
    // foursomeIdsTEMP stores [A1,A2,B1,B2] for a foursome and [A1,A2,B1] for a threesome.
    const playerMap = new Map<string, PrintablePlayer>(this.players.map(p => [p.member._id, p]));
    const foursomes: (PrintablePlayer | null)[][] = [];
    const foursomeIds: string[][] = (this.match.foursomeIdsTEMP || []) as string[][];

    if (foursomeIds.length > 0) {
      for (const ids of foursomeIds) {
        if (ids.length === 4) {
          // [A1,A2,B1,B2] → print: A1(line1), B2(line2=A1 partner), A2(line3), B1(line4=A2 partner)
          foursomes.push([
            playerMap.get(ids[0]) ?? null,
            playerMap.get(ids[3]) ?? null,
            playerMap.get(ids[1]) ?? null,
            playerMap.get(ids[2]) ?? null,
          ]);
        } else if (ids.length === 3) {
          // [A1,A2,B1] → A1+B1 paired, A2 lone; print: A1, B1, A2, blank
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
      // Fallback: derive groups from handicap order using the same algorithm as pairFourballTeams.
      // Sort ascending by course handicap (A players = lower indices).
      const sorted = [...this.players].sort((a, b) => (a.rochIndex ?? 99) - (b.rochIndex ?? 99));
      const groupSizes = getGroupSizes(sorted.length);
      const numA = 2 * groupSizes.filter(s => s >= 3).length;
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
          // Snake: A1+B2 vs A2+B1; print: A1, B2, A2, B1
          foursomes.push([A1, B2, A2, B1]);
        } else if (size === 3) {
          const A1 = aPlayers[aIdx] ?? null;
          const A2 = aPlayers[aIdx + 1] ?? null;
          const B1 = bPlayers[bIdx] ?? null;
          aIdx += 2; bIdx += 1;
          // A1+B1 paired, A2 lone; print: A1, B1, A2, blank
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
    // Within each group, put the lower-handicap player first on each 2-man team.
    // Team 1 occupies slots 0-1, Team 2 occupies slots 2-3.
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

    console.log('Print groups:', foursomes.map(g => g.map(p => p ? `${p.member.firstName} ${p.member.lastName}` : '(blank)')));

    try {
      // Convert to interface types expected by the service
      const matchData: MatchData = {
        _id: this.match._id!,
        description: this.match.name || 'Golf Match',
        course: this.scorecard.course,
        teeTime: this.match.datePlayed || new Date().toISOString(),
        members: this.players.map(p => p.member._id!)
      };

      const scorecardData: ScorecardData = {
        _id: this.scorecard._id || '',
        course: this.scorecard.course || '',
        // courseName: this.scorecard.course || 'Golf Course',
        tees: this.scorecard.courseTeeName || 'Regular',
        teeAbreviation: this.scorecard.teeAbreviation || '',
        pars: this.scorecard.pars || Array(18).fill(4),
        hCaps: this.scorecard.hCaps || Array.from({length: 18}, (_, i) => i + 1),
        distances: this.scorecard.yards || Array(18).fill(0)
      };

      // Generate PDF using the service for all foursomes
      await this.pdfService.generateScorecardPDF(
        matchData,
        scorecardData,
        foursomes,
        { openInNewWindow: true }
      );

      this.snackBar.open('Scorecards ready - choose Download, Email, or Print from the preview window!', 'Close', { duration: 5000 });

    } catch (error) {
      console.error('Error generating scorecard:', error);
      this.snackBar.open('Error generating scorecard', 'Close', { duration: 3000 });
    }
  }

  goBack(): void {
    this.router.navigate(['/matches']);
  }
}