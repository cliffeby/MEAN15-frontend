import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MemberService } from '../../services/memberService';
import { MatchService } from '../../services/matchService';
import { ScoreService } from '../../services/scoreService';

import { Member } from '../../models/member';
import { Match } from '../../models/match';
import { Score } from '../../models/score';
import { calculateCourseHandicap } from '../../utils/score-utils';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { UserPreferencesService, ColumnPreference } from '../../services/user-preferences.service';

export interface TopWinner {
  name: string;
  twoBall: number;
  oneBall: number;
  indo: number;
  total: number;
}

export interface RecentRoundWinners {
  matchId: string;
  datePlayed: string;
  winners: { twoBall: string[]; oneBall: string[]; indo: string[] };
}

export interface MemberReportRow {
  name: string;
  lastName: string;
  recentDateOfPlay: string | null;
  usgaIndexB4Round: number | null;
  rochIndexB4Round: number | null;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatMenuModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule
  ],
})

export class ReportsComponent implements OnInit {
  static readonly COLUMN_PREF_KEY = 'memberReportColumns';
  static readonly DEFAULT_COLUMNS: ColumnPreference[] = [
    { key: 'name', visible: true },
    { key: 'recentDateOfPlay', visible: true },
    { key: 'usgaIndexB4Round', visible: true },
    { key: 'rochIndexB4Round', visible: true },
  ];

  showingMemberReport = false;
  showingRosterReport = false;
  showingWinnersReport = false;
  winnersTopFive: TopWinner[] = [];
  winnersRecentRounds: RecentRoundWinners[] = [];
  winnersLoading = false;
    // Roster report state
    mostRecentMatch: Match | null = null;
    rosterFoursomes: Array<{
      groupNum: number;
      players: Array<{
        member: Member | undefined;
        score: Score | undefined;
        courseHandicap: number | undefined;
      }>;
    }> = [];
    rosterHeader: string = '';
    rosterCourse: string = '';
    rosterSlope: number | undefined;
    rosterDate: string = '';
    rosterPartnerDisplayGroups: Array<{
      groupNum: number;
      partners: Array<Array<{ name: string; handicap: number | undefined; teeAbbreviation: string | undefined }>>;
    }> = [];

    constructor(
      private memberService: MemberService,
      private preferencesService: UserPreferencesService,
      private matchService: MatchService,
      private scoreService: ScoreService,
    ) {}
  today = new Date();
  sortField: 'lastName' | 'recentDateOfPlay' | 'rochIndexB4Round' | 'usgaIndexB4Round' = 'lastName';
  sortDirection: 'asc' | 'desc' = 'asc';
  memberReport: MemberReportRow[] = [];
  filteredReport: MemberReportRow[] = [];

  allColumns: Array<{ key: string; label: string; visible: boolean }> = [
    { key: 'name', label: 'Name', visible: true },
    { key: 'recentDateOfPlay', label: 'Most Recent Date of Play', visible: true },
    { key: 'usgaIndexB4Round', label: 'USGA Index', visible: true },
    { key: 'rochIndexB4Round', label: 'Roch Index', visible: true },
  ];

  showWinnersReport() {
    this.showingWinnersReport = true;
    this.showingMemberReport = false;
    this.showingRosterReport = false;
    this.mostRecentMatch = null;
    this.rosterPartnerDisplayGroups = [];
    this.winnersLoading = true;
    this.winnersTopFive = [];
    this.winnersRecentRounds = [];
    this.scoreService.getWinnersReport().subscribe({
      next: (resp: any) => {
        this.winnersTopFive = resp.topFive || [];
        this.winnersRecentRounds = resp.recentRounds || [];
        this.winnersLoading = false;
      },
      error: () => {
        this.winnersLoading = false;
      }
    });
  }

  showRosterReport() {
    this.showingRosterReport = true;
    this.showingMemberReport = false;
    this.showingWinnersReport = false;
    this.matchService.getAll().subscribe((matchesResp: any) => {
      let matches: Match[] = [];
      if (Array.isArray(matchesResp)) {
        matches = matchesResp;
      } else if (matchesResp && Array.isArray(matchesResp.matches)) {
        matches = matchesResp.matches;
      } else if (matchesResp && Array.isArray(matchesResp.data)) {
        matches = matchesResp.data;
      }
      if (!matches || matches.length === 0) return;
      const sorted = matches.filter(m => m.datePlayed).sort((a, b) => {
        const aDate = new Date(a.datePlayed!).getTime();
        const bDate = new Date(b.datePlayed!).getTime();
        return bDate - aDate;
      });
      const match = sorted[0];
      this.mostRecentMatch = match;
      this.rosterHeader = match.name;
      this.rosterDate = match.datePlayed || '';
      let slope: number | undefined = undefined;
      let course: string = '';
      if (typeof match.scorecardId === 'object' && match.scorecardId) {
        slope = match.scorecardId.slope;
        course = match.scorecardId.course;
      }
      this.rosterSlope = slope;
      this.rosterCourse = course;
      this.memberService.getAll().subscribe((members: Member[]) => {
        // Debug: log the relevant data for troubleshooting
        console.log('foursomeIdsTEMP', (match as any).foursomeIdsTEMP);
        console.log('partnerIdsTEMP', (match as any).partnerIdsTEMP);
        console.log('members', members.map(m => m._id));
        this.rosterPartnerDisplayGroups = this.getFoursomePartnerDisplayGroups(members);
        console.log('rosterPartnerDisplayGroups', this.rosterPartnerDisplayGroups);
      });
    });
  }
  printRosterReport() {
    setTimeout(() => window.print(), 100);
  }

  ngOnInit(): void {
    this.loadColumnPreferences();
  }

  showMemberReport() {
    this.showingMemberReport = true;
    this.showingRosterReport = false;
    this.showingWinnersReport = false;
    this.mostRecentMatch = null;
    this.rosterPartnerDisplayGroups = [];
    this.memberService.getAllMembersWithRecentPlayAndHCap().subscribe((members: any[]) => {
      this.memberReport = members.map(m => ({
        name: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
        lastName: m.lastName ?? '',
        recentDateOfPlay: m.lastDatePlayed ?? m.recentDateOfPlay ?? m.recentDate ?? null,
        usgaIndexB4Round: m.usgaIndexB4Round ?? null,
        rochIndexB4Round: m.rochIndexB4Round ?? null
      }));
      this.applyFilterAndSort();
    });
  }

  applyFilterAndSort() {
    this.filteredReport = this.memberReport
      .filter(m => m.rochIndexB4Round !== null && m.rochIndexB4Round !== undefined)
      .sort((a, b) => {
        let aVal = a[this.sortField];
        let bVal = b[this.sortField];
        if (this.sortField === 'lastName') {
          aVal = typeof aVal === 'string' ? aVal.toLowerCase() : '';
          bVal = typeof bVal === 'string' ? bVal.toLowerCase() : '';
        }
        if (this.sortField === 'recentDateOfPlay') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        if (this.sortField === 'rochIndexB4Round') {
          aVal = aVal ? aVal : 0;
          bVal = bVal ? bVal : 0;
        }
        if (this.sortField === 'usgaIndexB4Round') {
          aVal = aVal ? aVal : 0;
          bVal = bVal ? bVal : 0;
        }
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return this.sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }

  setSort(field: 'lastName' | 'recentDateOfPlay' | 'rochIndexB4Round' | 'usgaIndexB4Round') {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilterAndSort();
  }

  // Column visibility helpers
  toggleColumnVisibility(columnKey: string) {
    const column = this.allColumns.find(col => col.key === columnKey);
    if (column) {
      // Prevent hiding all columns (keep at least one visible)
      const visibleColumns = this.allColumns.filter(col => col.visible).length;
      if (column.visible && visibleColumns <= 1) {
        return;
      }
      column.visible = !column.visible;
      this.saveColumnPreferences();
    }
  }

  saveColumnPreferences() {
    // Only save key/visible
    const prefs = this.allColumns.map(col => ({ key: col.key, visible: col.visible }));
    this.preferencesService.saveCustomColumnPreferences(ReportsComponent.COLUMN_PREF_KEY, prefs);
  }

  loadColumnPreferences() {
    // Get preferences and merge with labels
    const prefs = this.preferencesService.getCustomColumnPreferences(ReportsComponent.COLUMN_PREF_KEY, ReportsComponent.DEFAULT_COLUMNS);
    // Merge with labels
    this.allColumns.forEach(col => {
      const pref = prefs.find(p => p.key === col.key);
      if (pref) col.visible = pref.visible;
    });
  }

  resetColumns() {
    this.allColumns.forEach(col => (col.visible = true));
    this.saveColumnPreferences();
  }

  isColumnVisible(columnKey: string): boolean {
    const column = this.allColumns.find(col => col.key === columnKey);
    return column ? column.visible : false;
  }

  getVisibleColumnsCount(): number {
    return this.allColumns.filter(col => col.visible).length;
  }

  printMemberReport() {
    setTimeout(() => window.print(), 100);
  }

  // Utility to get grouped names by partner for each foursome
  getFoursomePartnerGroups(): Array<{
    groupNum: number;
    partners: string[][];
  }> {
    if (!this.mostRecentMatch) return [];
    const foursomes: string[][] = (this.mostRecentMatch as any).foursomeIdsTEMP || [];
    const partners: string[][][] = (this.mostRecentMatch as any).partnerIdsTEMP || [];
    // Each foursome, group by partner (using partnerIdsTEMP)
    return foursomes.map((foursome, idx) => {
      const partnerGroups: string[][] = (partners[idx] || []).map(
        partnerGroup => partnerGroup.filter(pid => foursome.includes(pid))
      );
      return {
        groupNum: idx + 1,
        partners: partnerGroups
      };
    });
  }
    public calculateCourseHandicap(index: number, slope: number | undefined): number {
    if (!index || !slope) {
      return 0;
    }
    return Math.round((index * slope) / 113);
  }


  // Utility to get grouped player display info by partner for each foursome, using the API's flat partnerIdsTEMP
  getFoursomePartnerDisplayGroups(members: Member[]): Array<{
    groupNum: number;
    partners: Array<Array<{ name: string; handicap: number | undefined; teeAbbreviation: string | undefined }>>;
  }> {
    if (!this.mostRecentMatch) return [];
    const foursomes: string[][] = (this.mostRecentMatch as any).foursomeIdsTEMP || [];
    const partnersFlat: string[][] = (this.mostRecentMatch as any).partnerIdsTEMP || [];
    // For each foursome, find the two partner groups in partnersFlat that are subsets of the foursome
    return foursomes.map((foursome, idx) => {
      // Find all partner groups that are subsets of this foursome
      const partnerGroupsRaw = partnersFlat.filter(pg => Array.isArray(pg) && pg.every(pid => foursome.includes(pid)));
      // Defensive: only take the first two partner groups for each foursome
      const partnerGroups = partnerGroupsRaw.slice(0, 2).map(
        partnerGroup => partnerGroup.map(pid => {
          const member = members.find(m => m._id === pid);
          let teeAbbreviation: string | undefined = undefined;
          if (this.mostRecentMatch && Array.isArray((this.mostRecentMatch as any).teeAbreviations)) {
            const matchTeeAbbrevs = (this.mostRecentMatch as any).teeAbreviations;
            const idxInFoursome = foursome.indexOf(pid);
            if (idxInFoursome !== -1) {
              teeAbbreviation = matchTeeAbbrevs[idxInFoursome];
            }
          }
          return {
            name: member ? `${member.firstName} ${member.lastName}` : pid,
            handicap: member?.rochIndexB4Round,
            teeAbbreviation
          };
        })
      );
      return {
        groupNum: idx + 1,
        partners: partnerGroups
      };
    });
  }
}
