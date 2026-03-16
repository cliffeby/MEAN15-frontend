import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Member } from '../../models/member';
import { pairFourballTeams, getTeamIndexSum, PairedGroup } from '../../utils/pair-utils';

@Component({
  selector: 'app-match-lineup',
  templateUrl: './match-lineup.html',
  styleUrls: ['./match-lineup.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
})
export class MatchLineupComponent {
  @Input() pairingMode = false;
  ngOnChanges() {
    if (this.pairingMode && this.foursomeIdsTEMP && this.foursomeIdsTEMP.length > 0) {
      // Reconstruct pairedTeams from foursomeIdsTEMP
      this.pairedTeams = [];
      for (const group of this.foursomeIdsTEMP) {
        if (group.length === 4) {
          // Stored as [A1, A2, B1, B2]; snake: A1+B2 vs A2+B1
          const teamAIds = [group[0], group[3]];
          const teamBIds = [group[1], group[2]];
          this.pairedTeams.push({
            teamA: teamAIds,
            teamB: teamBIds,
            combinedA: this.getTeamIndexSum(teamAIds),
            combinedB: this.getTeamIndexSum(teamBIds)
          });
        } else if (group.length === 3) {
          // Stored as [A1, A2, B1]; A1+B1 paired, A2 is loneA
          const pairIds = [group[0], group[2]];
          this.pairedTeams.push({
            teamA: pairIds,
            teamB: [],
            combinedA: this.getTeamIndexSum(pairIds),
            combinedB: 0,
            loneA: group[1]
          });
        } else {
          // Duo or solo: show as-is
          this.pairedTeams.push({
            teamA: [...group],
            teamB: [],
            combinedA: this.getTeamIndexSum([...group]),
            combinedB: 0
          });
        }
      }
    }
  }
  @Output() pairingUpdated = new EventEmitter<{
    foursomeIdsTEMP: string[][];
    partnerIdsTEMP: string[][];
  }>();
  // Stores the result of fourball pairing
  pairedTeams: PairedGroup[] = [];

  // Pairing logic for fourball
  pairFourballTeams() {
    if (!this.members || !this.lineUpsArray) return;
    this.pairingMode = true;
    const result = pairFourballTeams(this.members, this.getMemberById.bind(this), this.lineUpsArray);
    this.pairedTeams = result.pairedTeams;
    this.foursomeIdsTEMP = result.foursomeIdsTEMP;
    this.partnerIdsTEMP = result.partnerIdsTEMP;
    this.pairingUpdated.emit({ foursomeIdsTEMP: result.foursomeIdsTEMP, partnerIdsTEMP: result.partnerIdsTEMP });
  }

  // Call this when user presses pair button
  onPairButton() {
    this.pairFourballTeams();
  }
  @Input() foursomeIdsTEMP: string[][] = [];
  @Input() partnerIdsTEMP: string[][] = [];
  getTeamIndexSum(team: string[]): number {
    return getTeamIndexSum(team, this.getMemberById.bind(this));
  }
  // Removed duplicate pairedTeams property

  exitPairing() {
    this.pairingMode = false;
    this.pairedTeams = [];
  }
  @Output() addMembers = new EventEmitter<void>();

  onAddMembers() {
    // Sort members by lastName before emitting the event
    this.members.sort((a, b) => {
      const lastNameA = (a.lastName || '').toLowerCase();
      const lastNameB = (b.lastName || '').toLowerCase();
      if (lastNameA < lastNameB) return -1;
      if (lastNameA > lastNameB) return 1;
      return 0;
    });

    this.addMembers.emit();
  }
  @Input() members: Member[] = [];
  @Input() lineUpsArray!: FormArray;
  @Output() removeGroup = new EventEmitter<number>();

  getMemberById(memberId: string): Member | undefined {
    return this.members.find((m) => m._id === memberId);
  }

  getCompactNameWithIndex(member: Member): string {
    const firstInitial = member.firstName ? member.firstName.charAt(0).toUpperCase() : '';
    const lastName = member.lastName || 'Unknown';
    const index = typeof member.rochIndexB4Round === 'number' ? member.rochIndexB4Round.toFixed(1) : 'NA';
    return `${lastName}, ${firstInitial}(${index})`;
  }

  onRemoveGroup(startIndex: number): void {
    this.removeGroup.emit(startIndex);
  }
}
