import { Component, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScoreService } from '../../services/scoreService';
import { MatchService } from '../../services/matchService';
import { MemberService } from '../../services/memberService';
import { Score } from '../../models/score';
import { Match } from '../../models/match';
import { Member } from '../../models/member';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

interface GroupedScores {
  matchId: string | null;
  matchName: string;
  matchDate: string | null;
  scores: Score[];
  expanded?: boolean;
  isOrphaned?: boolean;
  orphanType?: 'match' | 'member' | 'scorecard' | 'user';
}

interface GroupedByMember {
  memberId: string;
  memberName: string;
  scores: Score[];
  roundCount: number;
  expanded?: boolean;
}

@Component({
  selector: 'app-score-list',
  templateUrl: './score-list.html',
  styleUrls: ['./score-list.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ]
})
export class ScoreListComponent implements OnInit {
  scores: Score[] = [];
  groupedScores: GroupedScores[] = [];
  matches: Match[] = [];
  members: Member[] = [];
  groupedByMember: GroupedByMember[] = [];
  filteredGroupedByMember: GroupedByMember[] = [];
  memberSearchTerm = '';
  loading = false;
  displayedColumns: string[] = ['name', 'score', 'postedScore', 'datePlayed', 'course', 'handicap', 'usgaIndex', 'method', 'actions'];
  memberDisplayedColumns: string[] = ['match', 'score', 'postedScore', 'datePlayed', 'course', 'handicap', 'usgaIndex', 'method', 'actions'];

  constructor(
    private scoreService: ScoreService,
    private matchService: MatchService,
    private memberService: MemberService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService
  ) {}

 get isAuthorized(): boolean {
    return this.authService.hasMinRole('fieldhand');
  }
  get isAuthorizedToDelete(): boolean {
    return this.authService.hasMinRole('admin');
  }


  ngOnInit() {
    this.loadMembers();
    this.loadMatches();
  }

  loadMembers() {
    this.memberService.getAll().subscribe({
      next: (res) => {
        this.members = res;
      },
      error: () => {
        this.snackBar.open('Error loading members', 'Close', { duration: 2000 });
      }
    });
  }

  loadMatches() {
    this.loading = true;
    this.matchService.getAll().subscribe({
      next: (res) => {
        this.matches = res.matches || res;
        this.loadScores();
      },
      error: () => {
        this.snackBar.open('Error loading matches', 'Close', { duration: 2000 });
        this.loading = false;
        // Load scores anyway, even if matches fail
        this.loadScores();
      }
    });
  }

  loadScores() {
    this.loading = true;
    this.scoreService.getAll().subscribe({
      next: (res) => {
        console.log('Scores loaded:', res);    
        this.scores = res.scores || res;
        this.groupScoresByMatch();
        this.groupScoresByMember();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error loading scores', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }

  groupScoresByMatch() {
    const grouped = new Map<string, Score[]>();
    
    // Group scores by matchId
    this.scores.forEach(score => {
      const matchId = this.extractMatchId(score);
      if (!grouped.has(matchId)) {
        grouped.set(matchId, []);
      }
      grouped.get(matchId)!.push(score);
    });

    // Convert to GroupedScores array
    const allGroups = Array.from(grouped.entries()).map(([matchId, scores]) => {
      // Get match info from populated object or find in matches array
      const matchInfo = this.extractMatchInfo(scores[0]) || 
        this.matches.find(m => (m._id) === matchId);
      
      // Detect if this is an orphaned group
      const isOrphaned = matchId !== 'no-match' && !matchInfo;
      
      // Check for other types of orphans in the scores
      const hasOrphanedMembers = scores.some(score => 
        score.memberId && typeof score.memberId === 'string' && !score.name
      );
      
      let groupName = '';
      if (matchId === 'no-match') {
        groupName = 'Unassigned Scores';
      } else if (isOrphaned) {
        groupName = `⚠️ Orphaned Match (${matchId.substring(0, 8)}...)`;
      } else {
        groupName = matchInfo ? matchInfo.name : `Match ${matchId}`;
      }
      
      return {
        matchId: matchId === 'no-match' ? null : matchId,
        matchName: groupName,
        matchDate: matchInfo ? (matchInfo.datePlayed || null) : null,
        scores: scores.sort((a, b) => new Date(b.datePlayed || '').getTime() - new Date(a.datePlayed || '').getTime()),
        expanded: isOrphaned, // Auto-expand orphaned groups for attention
        isOrphaned: isOrphaned,
        orphanType: isOrphaned ? 'match' : (hasOrphanedMembers ? 'member' : undefined) as 'match' | 'member' | 'scorecard' | 'user' | undefined
      };
    });

    // Sort groups by date (most recent first), but put orphaned groups at top
    allGroups.sort((a, b) => {
      // Orphaned groups go to the top
      if (a.isOrphaned && !b.isOrphaned) return -1;
      if (!a.isOrphaned && b.isOrphaned) return 1;
      // Then sort by date
      const dateA = a.matchDate || a.scores[0]?.datePlayed || '';
      const dateB = b.matchDate || b.scores[0]?.datePlayed || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Only show the four most recent matches
    this.groupedScores = allGroups.slice(0, 4);
  }

  editScore(id: string) {
    this.router.navigate(['/scores/edit', id]);
  }

  deleteScore(id: string) {
    if (!id) return;
    if (!this.isAuthorizedToDelete) {
      this.snackBar.open('You are not authorized to delete scores.', 'Close', { duration: 2500 });
      return;
    }

    // Find the score to get its name for the confirmation dialog
    const score = this.scores.find(s => s._id === id);
    const scoreName = score?.name || `Score ${id}`;
    const authorName = this.authService.getAuthorName() || '';

    this.confirmDialog.confirmDelete(scoreName, 'score').subscribe(confirmed => {
      if (confirmed) {
        this.scoreService.delete({ id, name: scoreName, authorName }).subscribe({
          next: () => {
            this.snackBar.open('Score deleted', 'Close', { duration: 2000 });
            this.loadScores();
          },
          error: (err) => {
            if (err.status === 403 || err.status === 401) {
              this.snackBar.open('You are not authorized to delete scores.', 'Close', { duration: 2500 });
            } else {
              this.snackBar.open('Error deleting score', 'Close', { duration: 2000 });
            }
          }
        });
      }
    });
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  formatScore(score: number): string {
    return score ? score.toString() : 'N/A';
  }

  formatScoreMethod(method: string | undefined): string {
    if (!method) return 'N/A';
    switch(method) {
      case 'byHole':
        return 'By Hole';
      case 'differential':
        return 'Differential';
      case 'total':
        return 'Total';
      default:
        return method;
    }
  }

  formatHandicap(handicap: number): string {
    if (handicap === null || handicap === undefined) return 'N/A';
    return handicap.toString();
  }

  formatCourseName(scName: string): string {
    return scName || 'N/A';
  }

  toggleGroup(group: GroupedScores) {
    group.expanded = !group.expanded;
  }

  expandAllGroups() {
    this.groupedScores.forEach(group => group.expanded = true);
  }

  collapseAllGroups() {
    this.groupedScores.forEach(group => group.expanded = false);
  }

  private extractMatchId(score: Score): string {
    if (typeof score.matchId === 'object' && score.matchId) {
      return score.matchId._id || 'no-match';
    }
    return score.matchId || 'no-match';
  }

  private extractMatchInfo(score: Score): any {
    if (typeof score.matchId === 'object' && score.matchId) {
      return score.matchId;
    }
    return null;
  }

  isScoreOrphaned(score: Score): boolean {
    // Check for orphaned member reference
    if (score.memberId && typeof score.memberId === 'string' && !score.name) {
      return true;
    }
    
    // Check for missing essential data that might indicate orphaned references
    if (!score.name || score.name.trim() === '') {
      return true;
    }
    
    return false;
  }

  getOrphanWarning(score: Score): string {
    if (!score.name || score.name.trim() === '') {
      return 'Missing player name - possible orphaned member reference';
    }
    if (score.memberId && typeof score.memberId === 'string' && !score.name) {
      return 'Member reference broken - member may have been deleted';
    }
    return '';
  }

  groupScoresByMember() {
    // Get date 12 months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Filter scores from last 12 months
    const recentScores = this.scores.filter(score => {
      const scoreDate = new Date(score.datePlayed || '');
      return scoreDate >= twelveMonthsAgo;
    });

    // Count rounds per member
    const memberRounds = new Map<string, { member: Member | null, scores: Score[], count: number }>();

    recentScores.forEach(score => {
      const memberId = this.extractMemberId(score);
      if (memberId) {
        if (!memberRounds.has(memberId)) {
          const member = this.members.find(m => m._id === memberId) || null;
          memberRounds.set(memberId, { member, scores: [], count: 0 });
        }
        const memberData = memberRounds.get(memberId)!;
        memberData.scores.push(score);
        memberData.count++;
      }
    });

    // Convert to array and sort by round count
    const allGrouped = Array.from(memberRounds.entries()).map(([memberId, data]) => ({
      memberId,
      memberName: data.scores[0]?.name || 'Unknown Player', // Updated to use score.name directly
      scores: data.scores.sort((a, b) => new Date(b.datePlayed || '').getTime() - new Date(a.datePlayed || '').getTime()),
      roundCount: data.count,
      expanded: false
    })).sort((a, b) => b.roundCount - a.roundCount);

    // Store all grouped members
    this.groupedByMember = allGrouped;

    // Initially show only top 5
    this.filteredGroupedByMember = allGrouped.slice(0, 5);
  }

  onMemberSearch() {
    if (!this.memberSearchTerm.trim()) {
      // No search term - show top 5
      this.filteredGroupedByMember = this.groupedByMember.slice(0, 5);
    } else {
      // Filter by search term
      const searchLower = this.memberSearchTerm.toLowerCase();
      this.filteredGroupedByMember = this.groupedByMember.filter(group =>
        group.memberName.toLowerCase().includes(searchLower)
      );
    }
  }

  clearMemberSearch() {
    this.memberSearchTerm = '';
    this.onMemberSearch();
  }

  private extractMemberId(score: Score): string | null {
    if (typeof score.memberId === 'object' && score.memberId) {
      return (score.memberId as any)._id || null;
    }
    return score.memberId || null;
  }

}