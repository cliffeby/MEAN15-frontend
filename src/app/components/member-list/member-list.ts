import { Component, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { MemberService } from '../../services/member';
import { Member } from '../../models/member';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth } from '../../services/auth';

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
    private auth: Auth
  ) {}
  get isAdmin(): boolean {
    return this.auth.role === 'admin';
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
    if (confirm('Are you sure you want to delete this member?')) {
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
  }
}
