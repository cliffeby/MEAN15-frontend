import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Member } from '../../models/member';

@Component({
	selector: 'app-match-lineup',
	templateUrl: './match-lineup.html',
	styleUrls: ['./match-lineup.scss'],
	standalone: true,
	imports: [CommonModule, MatIconModule, MatButtonModule]
})
export class MatchLineupComponent {
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
			pairingMode = false;
			pairedTeams: { team1: string[], team2: string[] }[] = [];

			pairTeams() {
				this.pairingMode = true;
				this.pairedTeams = [];
				const members = this.lineUpsArray.value as string[];
				for (let i = 0; i < members.length; i += 4) {
					const group = members.slice(i, i + 4);
					if (group.length === 4) {
						// Shuffle group
						const shuffled = [...group].sort(() => Math.random() - 0.5);
						this.pairedTeams.push({ team1: [shuffled[0], shuffled[1]], team2: [shuffled[2], shuffled[3]] });
					} else {
						// If not a full foursome, just show as is
						this.pairedTeams.push({ team1: group.slice(0, 2), team2: group.slice(2) });
					}
				}
			}

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
		return this.members.find(m => m._id === memberId);
	}

	getCompactNameWithIndex(member: Member): string {
		const firstInitial = member.firstName ? member.firstName.charAt(0).toUpperCase() : '';
		const lastName = member.lastName || 'Unknown';
		const index = (typeof member.usgaIndex === 'number') ? member.usgaIndex.toFixed(1) : 'NA';
		return `${lastName}, ${firstInitial}(${index})`;
	}

	onRemoveGroup(startIndex: number): void {
		this.removeGroup.emit(startIndex);
	}
}
