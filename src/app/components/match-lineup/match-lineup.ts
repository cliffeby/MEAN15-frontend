import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Member } from '../../models/member';
import { pairFourballTeams, getTeamIndexSum } from '../../utils/pair-utils';

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
      for (const foursome of this.foursomeIdsTEMP) {
        if (foursome.length === 4) {
          // Two teams of two (normal foursome)
          this.pairedTeams.push({
            teamA: [foursome[0], foursome[1]],
            teamB: [foursome[2], foursome[3]],
            combinedA: this.getTeamIndexSum([foursome[0], foursome[1]]),
            combinedB: this.getTeamIndexSum([foursome[2], foursome[3]])
          });
        } else if (foursome.length === 3) {
          // Trio: teamA of 3, teamB empty
          this.pairedTeams.push({
            teamA: [foursome[0], foursome[1], foursome[2]],
            teamB: [],
            combinedA: this.getTeamIndexSum([foursome[0], foursome[1], foursome[2]]),
            combinedB: 0
          });
        } else if (foursome.length === 2) {
          // Odd team out
          this.pairedTeams.push({
            teamA: [foursome[0], foursome[1]],
            teamB: [],
            combinedA: this.getTeamIndexSum([foursome[0], foursome[1]]),
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
  pairedTeams: { teamA: string[]; teamB: string[]; combinedA: number; combinedB: number }[] = [];

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
    const found = this.members.find((m) => m._id === memberId);
    if (found) return found;
    // If not found and is dummy, return MEMBER_B_DUMMY
    if (memberId === '00000000000000000000B001') {
      // Import MEMBER_B_DUMMY at top if not already
      // @ts-ignore
      return require('../../models/member-b-dummy').MEMBER_B_DUMMY;
    }
    return undefined;
  }

  getCompactNameWithIndex(member: Member): string {
    // If dummy, show 'B.Dummy' only
    if (member._id === '00000000000000000000B001') {
      return `B.Dummy(${typeof member.usgaIndex === 'number' ? member.usgaIndex.toFixed(1) : 'NA'})`;
    }
    const firstInitial = member.firstName ? member.firstName.charAt(0).toUpperCase() : '';
    const lastName = member.lastName || 'Unknown';
    const index = typeof member.usgaIndex === 'number' ? member.usgaIndex.toFixed(1) : 'NA';
    return `${lastName}, ${firstInitial}(${index})`;
  }

  onRemoveGroup(startIndex: number): void {
    this.removeGroup.emit(startIndex);
  }
}
