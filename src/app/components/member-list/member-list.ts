import { Component, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { MemberService } from '../../services/memberService';
import { Member } from '../../models/member';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/authService';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-member-list',
  templateUrl: './member-list.html',
  styleUrls: ['./member-list.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressBarModule
  ]
})
export class MemberListComponent implements OnInit {
  members: Member[] = [];
  loading = false;

  constructor(
    private memberService: MemberService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService
  ) {}
  get isAdmin(): boolean {
    return this.authService.role === 'admin';
  }

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    this.loading = true;
    this.memberService.getAll().subscribe({
      next: (res) => {
        console.log('Members loaded:', res);    
        this.members = res.members || res;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error loading members', 'Close', { duration: 2000 });
        this.loading = false;
      }
    });
  }

  editMember(id: string) {
    this.router.navigate(['/members/edit', id]);
  }

  addMember() {
    this.router.navigate(['/members/add']);
  }

  deleteMember(id: string) {
    if (!id) return;
    if (!this.isAdmin) {
      this.snackBar.open('You are not authorized to delete members.', 'Close', { duration: 2500 });
      return;
    }

    // Find the member to get their name for the confirmation dialog
    const member = this.members.find(m => m._id === id);
    const memberName = member ? `${member.firstName} ${member.lastName}`.trim() : `Member ${id}`;
    
    this.confirmDialog.confirmDelete(memberName, 'member').subscribe(confirmed => {
      if (confirmed) {
        this.memberService.delete(id).subscribe({
          next: () => {
            this.snackBar.open('Member deleted', 'Close', { duration: 2000 });
            this.loadMembers();
          },
          error: (err) => {
            if (err.status === 403 || err.status === 401) {
              this.snackBar.open('You are not authorized to delete members.', 'Close', { duration: 2500 });
            } else {
              this.snackBar.open('Error deleting member', 'Close', { duration: 2000 });
            }
          }
        });
      }
    });
  }
}
