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
import { ScoreService } from '../../services/scoreService';
import { Scorecard } from '../../models/scorecard.interface';
import { ScorecardPdfService } from '../../services/scorecard-pdf.service';
import { HandicapCalculationService } from '../../services/handicap-calculation.service';
import { EmailService } from '../../services/email.service';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { PrintablePlayer } from '../../models/printable-player.interface';
import { MatchData, ScorecardData } from '../../models/scorecard.interface';
import { getMemberScorecard } from '../../utils/score-entry-utils';
import { getGroupSizes } from '../../utils/pair-utils';
import { calculateOneBall } from '../../utils/one-ball.utils';
import { calculateMatchWinners, MatchWinnersResult, calculatePlayerScoreToPar, calculateSkins, SkinResult } from '../../utils/match-winners.utils';

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
  private scoreService = inject(ScoreService);
  private emailService = inject(EmailService);

  matchId!: string;
  match: Match | null = null;
  scorecard: Scorecard | null = null;
  players: PrintablePlayer[] = [];
  loading = false;

  private foursomes: (PrintablePlayer | null)[][] = [];
  private rawScoreByMember: Map<string, any> = new Map();
  private groupWinners: MatchWinnersResult[] = [];
  private globalIndoWinnerIds: string[] = [];
  private globalIndoWinnerNames: string[] = [];
  private globalIndoScore: number | null = null;
  private grossSkins: SkinResult[] = [];
  private netSkins: SkinResult[] = [];

  // Email draft state
  showEmailPreview = false;
  emailSending = false;
  emailSubject = '';
  emailHtml = '';
  emailRecipients: { name: string; email: string; memberId: string }[] = [];

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

        // Load scorecard, members, and existing scores
        forkJoin({
          scorecard: this.scorecardService.getById(finalScorecardId),
          members: this.memberService.getAll(),
          allScorecards: this.scorecardService.getAll(),
          existingScores: this.scoreService.getScoresByMatch(this.matchId)
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

              // Build a memberId → scores map from existing score records
              const scoresByMember = new Map<string, (number | null)[]>();
              const rawScores: any[] = data.existingScores?.scores || [];
              for (const s of rawScores) {
                if (s.scoreRecordType === 'byHole' && Array.isArray(s.scores)) {
                  const mid = typeof s.memberId === 'object' ? s.memberId._id : s.memberId;
                  if (mid) scoresByMember.set(mid, s.scores);
                }
              }

              // Keep full raw score objects keyed by member ID for winner persistence
              this.rawScoreByMember = new Map();
              for (const s of rawScores) {
                if (s.scoreRecordType === 'byHole') {
                  const mid = typeof s.memberId === 'object' ? s.memberId._id : s.memberId;
                  if (mid) this.rawScoreByMember.set(mid, s);
                }
              }

              if (lineupMemberIds.length > 0) {
                this.players = lineupMemberIds.map((memberId: string) => {
                  const member = members.find((m: any) => m._id === memberId);
                  if (member) {
                    const memberScorecard = getMemberScorecard(finalScorecard.course, member.scorecardsId || [], scorecardList);
                    return {
                      member,
                      rochIndex: this.handicapService.calculateCourseHandicap(member.rochIndexB4Round || 0, memberScorecard?.slope || 113),
                      teeAbreviation: memberScorecard?.teeAbreviation || '',
                      scores: member._id ? scoresByMember.get(member._id) : undefined,
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

      // Pass 1: compute 1-ball and 2-ball winners per group (indo will be replaced globally)
      this.foursomes = foursomes;
      this.groupWinners = [];
      this.clearWinnersForAllPlayers();
      for (const group of foursomes) {
        const realPlayers = group.filter((p): p is PrintablePlayer => p !== null);
        const lowestHcp = realPlayers.length > 0
          ? this.handicapService.getLowestHandicapInGroup(realPlayers)
          : 0;
        const ob1 = calculateOneBall(group[0] ?? null, group[1] ?? null, scorecardData, this.handicapService, lowestHcp);
        const ob2 = calculateOneBall(group[2] ?? null, group[3] ?? null, scorecardData, this.handicapService, lowestHcp);
        this.groupWinners.push(calculateMatchWinners(group, scorecardData, this.handicapService, ob1, ob2));
      }

      // Pass 2: cross-group indo — single lowest individual net-to-par wins; if tied all share 1st; no 2nd place
      this.globalIndoWinnerIds = [];
      this.globalIndoWinnerNames = [];
      this.globalIndoScore = null;
      const allNets: { p: PrintablePlayer; score: number }[] = [];
      for (const group of foursomes) {
        for (const p of group) {
          if (!p) continue;
          const score = calculatePlayerScoreToPar(p, scorecardData, this.handicapService);
          if (score !== null) allNets.push({ p, score });
        }
      }
      if (allNets.length > 0) {
        const globalBest = Math.min(...allNets.map(x => x.score));
        this.globalIndoScore = globalBest;
        for (const { p, score } of allNets) {
          if (score === globalBest) {
            this.globalIndoWinnerIds.push(p.member._id);
            this.globalIndoWinnerNames.push(`${p.member.firstName} ${p.member.lastName || ''}`.trim());
          }
        }
        // Replace each group's per-group indo with the global result
        for (let i = 0; i < this.groupWinners.length; i++) {
          const groupIds = foursomes[i].filter((p): p is PrintablePlayer => p !== null).map(p => p.member._id);
          const thisIds = this.globalIndoWinnerIds.filter(id => groupIds.includes(id));
          const thisNames = thisIds.map(id => {
            const p = foursomes[i].find(pl => pl?.member._id === id);
            return p ? `${p.member.firstName} ${p.member.lastName || ''}`.trim() : '';
          }).filter(Boolean);
          this.groupWinners[i] = { ...this.groupWinners[i], indoWinners: thisIds, indoWinnerNames: thisNames };
        }
      }

      // Persist winner flags (with global indo applied)
      for (let i = 0; i < foursomes.length; i++) {
        this.persistWinners(foursomes[i], this.groupWinners[i]);
      }

      // Compute skins across all players
      const allPlayersFlat = foursomes.flat().filter((p): p is PrintablePlayer => p !== null);
      const uniquePlayers = allPlayersFlat.filter((p, idx, arr) => arr.findIndex(q => q.member._id === p.member._id) === idx);
      const skins = calculateSkins(uniquePlayers, scorecardData, this.handicapService);
      this.grossSkins = skins.grossSkins;
      this.netSkins = skins.netSkins;

      // Expose email callback so the PDF preview window can trigger it
      (window as any).__scorecardEmail = () => this.prepareEmail();

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

  prepareEmail(): void {
    if (!this.match || !this.scorecard || this.players.length === 0) return;

    this.emailRecipients = this.players
      .filter(p => p.member.Email)
      .map(p => ({
        name: `${p.member.firstName} ${p.member.lastName || ''}`.trim(),
        email: p.member.Email!,
        memberId: p.member._id ?? '',
      }));

    const matchName = this.match.name || this.scorecard.course || 'Golf Match';
    const datePlayed = this.match.datePlayed
      ? new Date(this.match.datePlayed).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'recent round';

    this.emailSubject = `Your Scorecard – ${matchName} (${datePlayed})`;

    const fmt = (score: number | null): string => {
      if (score === null) return '';
      if (score === 0) return ' (E)';
      return score > 0 ? ` (+${score})` : ` (${score})`;
    };
    const teamStr = (names: string[]) => names.join(' + ');

    // 2-Ball: one line per group — winning team name(s) + combined score-to-par
    const twoBallLines = this.groupWinners.map(w =>
      w.twoBallWinnerNames.length
        ? `<p>${teamStr(w.twoBallWinnerNames)}${fmt(w.twoBallScore)}</p>`
        : '<p>No scores yet</p>'
    ).join('');

    // 1-Ball: per group — 1st place, then optional 2nd (only when 1st was not a tie)
    const oneBallLines = this.groupWinners.map(w => {
      if (w.oneBallFirstNames.length === 0) return '<p>No scores yet</p>';
      let html = `<p>${teamStr(w.oneBallFirstNames)}${fmt(w.oneBallFirstScore)}</p>`;
      if (w.oneBallSecondNames.length > 0) {
        html += `<p style="padding-left:1em;color:#666">${teamStr(w.oneBallSecondNames)}${fmt(w.oneBallSecondScore)}</p>`;
      }
      return html;
    }).join('');

    // Individual Net: global winner(s) + score-to-par
    const indoLine = this.globalIndoWinnerNames.length
      ? `<p>${this.globalIndoWinnerNames.join(', ')}${fmt(this.globalIndoScore)}</p>`
      : '<p>No scores yet</p>';

    // Skins — group multiple holes under one player entry
    const skinLines = (skins: SkinResult[]) => {
      if (!skins.length) return '<p>No skins</p>';
      const map = new Map<string, number[]>();
      for (const s of skins) {
        if (!map.has(s.playerName)) map.set(s.playerName, []);
        map.get(s.playerName)!.push(s.hole);
      }
      return Array.from(map.entries())
        .map(([name, holes]) => {
          const sorted = holes.slice().sort((a, b) => a - b);
          const label = sorted.length === 1 ? 'Hole' : 'Holes';
          return `<p>${name} — ${label} ${sorted.join(', ')}</p>`;
        })
        .join('');
    };

    const winnersHtml =
      `<p><strong>2-Ball</strong></p>${twoBallLines}` +
      `<p><strong>1-Ball</strong></p>${oneBallLines}` +
      `<p><strong>Individual Net</strong></p>${indoLine}` +
      `<p><strong>Gross Skins</strong></p>${skinLines(this.grossSkins)}` +
      `<p><strong>Net Skins</strong></p>${skinLines(this.netSkins)}`;


    this.emailHtml = `
<p>Results for <strong>${matchName}</strong> on ${datePlayed}:</p>
${winnersHtml}
<p></p>
<p></p>
<p>Protect the field!</p>
`.trim();

    this.showEmailPreview = true;
  }

  sendEmail(): void {
    if (this.emailRecipients.length === 0) {
      this.snackBar.open('No player email addresses found', 'Close', { duration: 3000 });
      return;
    }

    this.emailSending = true;
    this.emailService.sendToMembers({
      memberIds: this.emailRecipients.map(r => r.memberId).filter(Boolean),
      subject: this.emailSubject,
      htmlContent: this.emailHtml,
      personalize: false,
    }).subscribe({
      next: (res) => {
        this.emailSending = false;
        this.showEmailPreview = false;
        const count = res.recipientCount ?? this.emailRecipients.length;
        this.snackBar.open(`Email sent to ${count} player(s)`, 'Close', { duration: 4000 });
      },
      error: (err) => {
        this.emailSending = false;
        this.snackBar.open(err.message || 'Failed to send email', 'Close', { duration: 4000 });
      },
    });
  }

  cancelEmail(): void {
    this.showEmailPreview = false;
  }

  private clearWinnersForAllPlayers(): void {
    this.rawScoreByMember.forEach((rawScore) => {
      if (!rawScore?._id) return;
      this.scoreService.update(rawScore._id, { ...rawScore, wonOneBall: false, wonTwoBall: false, wonIndo: false }).subscribe({
        error: (err: any) => console.warn('Failed to clear winner flags:', err),
      });
    });
  }

  private persistWinners(
    group: (PrintablePlayer | null)[],
    winners: MatchWinnersResult,
  ): void {
    for (const player of group) {
      if (!player) continue;
      const mid = player.member._id;
      if (!mid) continue;
      const rawScore = this.rawScoreByMember.get(mid);
      if (!rawScore?._id) continue;
      const updated = {
        ...rawScore,
        wonOneBall: winners.oneBallWinners.includes(mid),
        wonTwoBall: winners.twoBallWinners.includes(mid),
        wonIndo: winners.indoWinners.includes(mid),
      };
      this.scoreService.update(rawScore._id, updated).subscribe({
        error: (err: any) => console.warn(`Failed to persist winner flags for ${mid}:`, err),
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/matches']);
  }
}