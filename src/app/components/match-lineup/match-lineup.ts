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

	getCompactName(member: Member): string {
		const firstInitial = member.firstName ? member.firstName.charAt(0).toUpperCase() : '';
		const lastName = member.lastName || 'Unknown';
		return `${lastName}, ${firstInitial}`;
	}

	onRemoveGroup(startIndex: number): void {
		this.removeGroup.emit(startIndex);
	}
}
