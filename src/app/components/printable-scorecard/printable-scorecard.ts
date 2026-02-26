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
              
              // Build players array
              if (match.members && Array.isArray(match.members)) {
                this.players = match.members.map((memberId: string) => {
                  const member = members.find((m: any) => m._id === memberId);
                  if (member) {
                    const memberScorecard = getMemberScorecard(finalScorecard.course, member.scorecardsId || [], scorecardList);
                    return {
                      member,
                      handicap: this.handicapService.calculateCourseHandicap(member.usgaIndex || 0),
                      teeAbreviation: memberScorecard?.teeAbreviation || '',
                    };
                  }
                  return null;
                }).filter(Boolean);
                
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
    
    // Parse handicap data from string if arrays are missing
    if ((!scorecard.hCaps || !Array.isArray(scorecard.hCaps)) && scorecard.hCapInputString) {
      console.log('Parsing handicap data from string:', scorecard.hCapInputString);
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

    // Group players into foursomes (arrays of 4)
    const foursomes: PrintablePlayer[][] = [];
    for (let i = 0; i < this.players.length; i += 4) {
      foursomes.push(this.players.slice(i, i + 4));
    }
    // Debug: log grouped foursomes
    if (foursomes && foursomes.length) {
      console.log('Foursomes:', foursomes.map(group => group.map(p => p.member && (p.member.firstName + ' ' + p.member.lastName))));
    } else {
      console.warn('No foursomes created:', foursomes);
    }

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