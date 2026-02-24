import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Member } from '../../models/member';

export interface MemberSelectionDialogData {
  members: Member[];
  currentLineup: string[];
  course?: string;
  scorecards?: any[];
}

@Component({
  selector: 'app-member-selection-dialog',
  templateUrl: './member-selection-dialog.html',
  styleUrls: ['./member-selection-dialog.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatListModule,
    MatCheckboxModule
  ]
})
export class MemberSelectionDialogComponent implements OnInit {
  allMembers: Member[] = [];
  filteredMembers: Member[] = [];
  selectedMemberIds: string[] = [];
  searchTerm: string = '';

  course: string | undefined;
  scorecards: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<MemberSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MemberSelectionDialogData,
    private cdr: ChangeDetectorRef
  ) {
    this.course = data.course;
    this.scorecards = data.scorecards || [];
  }

  ngOnInit() {
    this.allMembers = this.data.members || [];
    this.filteredMembers = [...this.allMembers];
    // Pre-select members that are already in the lineup
    this.selectedMemberIds = [...(this.data.currentLineup || [])];
    this.course = this.data.course;
    this.scorecards = this.data.scorecards || [];
    // Debug: Log the pre-selected members
    console.log('Dialog opened with current lineup:', this.selectedMemberIds);
    console.log('Available members:', this.allMembers.length);
    console.log('Current course for tee lookup:', this.course);
    console.log('Scorecards available for tee lookup:', this.scorecards.length);
  }

  getTeeForMember(member: Member): string | undefined {
    if (!this.course || !this.scorecards?.length) return undefined;

    // For each scorecardId entry on the member, look up the scorecard by _id
    // and return the tees from the one whose course matches this.course.
    // Entries can be plain strings (the scorecardId itself) or objects with a scorecardId property.
    for (const entry of ((member as any).scorecardsId || [])) {
      const id = typeof entry === 'string' ? entry : entry.scorecardId;
      const sc = this.scorecards.find(s => s._id === id && s.course === this.course);
      if (sc) return sc.tees;
    }
    return undefined;
  }

  filterMembers() {
    if (!this.searchTerm.trim()) {
      this.filteredMembers = [...this.allMembers];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredMembers = this.allMembers.filter(member => 
      `${member.firstName} ${member.lastName || ''}`.toLowerCase().includes(term) ||
      member.Email?.toLowerCase().includes(term) ||
      member.usgaIndex?.toString().includes(term)
    );
  }

  isSelected(memberId: string | undefined): boolean {
    return memberId ? this.selectedMemberIds.includes(memberId) : false;
  }

  isInOriginalLineup(memberId: string | undefined): boolean {
    return memberId ? (this.data.currentLineup || []).includes(memberId) : false;
  }

  toggleMember(memberId: string | undefined) {
    if (!memberId) return;
    
    const index = this.selectedMemberIds.indexOf(memberId);
    if (index >= 0) {
      // Remove from selection
      this.selectedMemberIds.splice(index, 1);
      console.log('Removed member:', memberId, 'New selection:', this.selectedMemberIds);
    } else {
      // Add to selection
      this.selectedMemberIds.push(memberId);
      console.log('Added member:', memberId, 'New selection:', this.selectedMemberIds);
    }
    
    // Trigger change detection to update UI
    this.cdr.detectChanges();
  }

  selectAll() {
    this.selectedMemberIds = this.filteredMembers.map(member => member._id).filter(id => id !== undefined) as string[];
  }

  clearAll() {
    this.selectedMemberIds = [];
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    console.log('Dialog closing with selected members:', this.selectedMemberIds);
    console.log('Selected count:', this.selectedMemberIds.length);
    this.dialogRef.close(this.selectedMemberIds);
  }
}