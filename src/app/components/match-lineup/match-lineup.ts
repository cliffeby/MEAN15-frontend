import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Member } from '../../models/member';
import { MEMBER_B_DUMMY } from '../../models/member-b-dummy';

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
    let lineupIds: string[] = this.lineUpsArray.value as string[];
    // Get member objects for lineup
    let lineupMembers = lineupIds.map((id) => this.getMemberById(id)).filter(Boolean) as Member[];
    // If odd number of players, add 'B Dummy' from models with last real player's index
    if (lineupMembers.length % 2 !== 0 && lineupMembers.length > 1) {
      let sortedForDummy = [...lineupMembers].sort((a, b) => (a.usgaIndex ?? 99) - (b.usgaIndex ?? 99));
      const lastPlayer = sortedForDummy[sortedForDummy.length - 1];
      if (lastPlayer) {
        const dummy: Member = { ...MEMBER_B_DUMMY, _id: '00000000000000000000B001', usgaIndex: lastPlayer.usgaIndex };
        lineupMembers.push(dummy);
      }
    }
    // Sort by handicap ascending
    lineupMembers.sort((a, b) => (a.usgaIndex ?? 99) - (b.usgaIndex ?? 99));
    // Handle odd number: duplicate lowest handicap player
    // if (lineupMembers.length % 2 !== 0 && lineupMembers.length > 1) {
    // 	lineupMembers.push(lineupMembers[0]);
    // }
    // Sort all players by USGA Index ascending
    let sortedMembers = [...lineupMembers].sort(
      (a, b) => (a.usgaIndex ?? 99) - (b.usgaIndex ?? 99)
    );
    let n = sortedMembers.length;
    // Handle odd number: duplicate lowest handicap player
    // if (n % 2 !== 0 && n > 1) {
    // 	sortedMembers.push(sortedMembers[0]);
    // 	n++;
    // }
    // Split into A and B
    let half = Math.floor(n / 2);
    let aPlayers = sortedMembers.slice(0, half);
    let bPlayers = sortedMembers.slice(half);
    console.log('A Players:', aPlayers);
    // Pair lowest A with highest B, but always assign lower index as A
    let teams: { ids: string[]; combined: number }[] = [];
    for (let i = 0; i < half; i++) {
      let a = aPlayers[i];
      let b = bPlayers[half - 1 - i];
      // Ensure A is lower index, B is higher
      if ((a?.usgaIndex ?? 99) > (b?.usgaIndex ?? 99)) {
        // Swap if needed
        [a, b] = [b, a];
      }
      const aId = typeof a?._id === 'string' ? a._id : '';
      const bId = typeof b?._id === 'string' ? b._id : '';
      const combined = Math.round(((a?.usgaIndex ?? 0) + (b?.usgaIndex ?? 0)) * 10) / 10;
      teams.push({ ids: [aId, bId], combined });
    }
    // Pair teams for fourball matches (teamA vs teamB)
    this.pairedTeams = [];
    let foursomeIdsTEMP: string[][] = [];
    let partnerIdsTEMP: string[][] = [];
    let i = 0;
    while (i < teams.length) {
      // If 3 teams left and total players is odd (11), make last group of 3
      if (teams.length - i === 3 && n === 11) {
        // Last three teams: group as a trio
        const trio = [teams[i].ids[0], teams[i].ids[1], teams[i+1].ids[0]];
        this.pairedTeams.push({
          teamA: trio,
          teamB: [],
          combinedA: this.getTeamIndexSum(trio),
          combinedB: 0,
        });
        foursomeIdsTEMP.push([...trio]);
        partnerIdsTEMP.push([...trio]);
        break;
      }
      let teamA = teams[i];
      let teamB = teams[i + 1];
      if (teamB) {
        this.pairedTeams.push({
          teamA: teamA.ids,
          teamB: teamB.ids,
          combinedA: teamA.combined,
          combinedB: teamB.combined,
        });
        // Store foursome as array of 4 member IDs
        foursomeIdsTEMP.push([...teamA.ids, ...teamB.ids]);
        // Store each partner team as array of 2 member IDs
        partnerIdsTEMP.push([...teamA.ids]);
        partnerIdsTEMP.push([...teamB.ids]);
      } else {
        // Odd team out
        this.pairedTeams.push({
          teamA: teamA.ids,
          teamB: [],
          combinedA: teamA.combined,
          combinedB: 0,
        });
        foursomeIdsTEMP.push([...teamA.ids]);
        partnerIdsTEMP.push([...teamA.ids]);
      }
      i += 2;
    }
    // Update @Input arrays for parent form
    this.foursomeIdsTEMP = foursomeIdsTEMP;
    this.partnerIdsTEMP = partnerIdsTEMP;
    this.pairingUpdated.emit({ foursomeIdsTEMP, partnerIdsTEMP });
  }

  // Call this when user presses pair button
  onPairButton() {
    this.pairFourballTeams();
  }
  @Input() foursomeIdsTEMP: string[][] = [];
  @Input() partnerIdsTEMP: string[][] = [];
  getTeamIndexSum(team: string[]): number {
    let sum = 0;
    for (const memberId of team) {
      const member = this.getMemberById(memberId);
      if (member && typeof member.usgaIndex === 'number') {
        sum += member.usgaIndex;
      }
    }
    return Math.round(sum * 10) / 10;
  }
  // Removed duplicate pairedTeams property

  exitPairing() {
    this.pairingMode = false;
    this.pairedTeams = [];
  }
  @Output() addMembers = new EventEmitter<void>();

  onAddMembers() {
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
