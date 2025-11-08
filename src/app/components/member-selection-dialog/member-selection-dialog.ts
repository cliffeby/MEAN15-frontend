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

  constructor(
    public dialogRef: MatDialogRef<MemberSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MemberSelectionDialogData,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.allMembers = this.data.members || [];
    this.filteredMembers = [...this.allMembers];
    // Pre-select members that are already in the lineup
    this.selectedMemberIds = [...(this.data.currentLineup || [])];
    
    // Debug: Log the pre-selected members
    console.log('Dialog opened with current lineup:', this.selectedMemberIds);
    console.log('Available members:', this.allMembers.length);
  }

  filterMembers() {
    if (!this.searchTerm.trim()) {
      this.filteredMembers = [...this.allMembers];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredMembers = this.allMembers.filter(member => 
      `${member.firstName} ${member.lastName || ''}`.toLowerCase().includes(term) ||
      member.email?.toLowerCase().includes(term) ||
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