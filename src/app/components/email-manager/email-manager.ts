import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { MemberService } from '../../services/memberService';
import { EmailService, EmailStatus } from '../../services/email.service';
import { AuthService } from '../../services/authService';
import { Member } from '../../models/member';
import { EmailDialogComponent, EmailDialogData, EmailDialogResult } from '../shared/email-dialog/email-dialog';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-email-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './email-manager.html',
  styleUrls: ['./email-manager.scss']
})
export class EmailManagerComponent implements OnInit {
  private memberService = inject(MemberService);
  private emailService = inject(EmailService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private confirmDialog = inject(ConfirmDialogService);

  // State
  members = signal<Member[]>([]);
  filteredMembers = signal<Member[]>([]);
  selection = new SelectionModel<Member>(true, []);
  loading = signal(false);
  emailStatus = signal<EmailStatus | null>(null);
  searchTerm = signal('');

  // Table columns
  displayedColumns = ['select', 'name', 'email', 'actions'];

  get isAdmin(): boolean {
    return this.authService.hasMinRole('admin');
  }

  get hasSelection(): boolean {
    return this.selection.selected.length > 0;
  }

  get membersWithEmail(): Member[] {
    return this.members().filter(m => m.Email && m.Email.trim() !== '');
  }

  get selectedCount(): number {
    return this.selection.selected.length;
  }

  ngOnInit() {
    this.loadEmailStatus();
    this.loadMembers();
  }

  loadEmailStatus() {
    this.emailService.getStatus().subscribe({
      next: (status) => {
        this.emailStatus.set(status);
        if (!status.configured) {
          this.snackBar.open(
            'Email service is not configured. Please contact administrator.',
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: (err) => {
        console.error('Failed to load email status:', err);
        this.snackBar.open('Failed to check email service status', 'Close', { duration: 3000 });
      }
    });
  }

  loadMembers() {
    this.loading.set(true);
    this.memberService.getAll().subscribe({
      next: (members) => {
        // Filter to only members with email addresses
        const membersWithEmail = members.filter(m => m.Email && m.Email.trim() !== '');
        this.members.set(membersWithEmail);
        this.filteredMembers.set(membersWithEmail);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load members:', err);
        this.snackBar.open('Failed to load members', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  filterMembers() {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      this.filteredMembers.set(this.members());
      return;
    }

    const filtered = this.members().filter(m => 
      m.firstName.toLowerCase().includes(term) ||
      (m.lastName && m.lastName.toLowerCase().includes(term)) ||
      m.Email.toLowerCase().includes(term)
    );
    this.filteredMembers.set(filtered);
  }

  isAllSelected(): boolean {
    return this.selection.selected.length === this.filteredMembers().length;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.filteredMembers());
    }
  }

  clearSelection() {
    this.selection.clear();
  }

  sendTestEmail() {
    if (!this.emailStatus()?.configured) {
      this.snackBar.open('Email service is not configured', 'Close', { duration: 3000 });
      return;
    }

    const userEmail = this.authService.getAuthorEmail();
    if (!userEmail) {
      this.snackBar.open('Could not determine your email address', 'Close', { duration: 3000 });
      return;
    }

    this.emailService.sendTestEmail(userEmail).subscribe({
      next: (response) => {
        this.snackBar.open(
          `Test email sent to ${userEmail}!`,
          'Close',
          { duration: 4000 }
        );
      },
      error: (err) => {
        console.error('Failed to send test email:', err);
        this.snackBar.open(`Failed to send test email: ${err.message}`, 'Close', { duration: 5000 });
      }
    });
  }

  emailSelected() {
    if (!this.hasSelection) {
      this.snackBar.open('Please select members to email', 'Close', { duration: 2500 });
      return;
    }

    const selectedMembers = this.selection.selected;
    const memberIds = selectedMembers.map(m => m._id || '').filter(id => id !== '');
    const memberNames = selectedMembers.map(m => `${m.firstName} ${m.lastName || ''}`);

    const dialogRef = this.dialog.open(EmailDialogComponent, {
      width: '700px',
      disableClose: false,
      data: {
        memberIds,
        memberNames,
        sendToAll: false
      } as EmailDialogData
    });

    dialogRef.afterClosed().subscribe((result: EmailDialogResult) => {
      if (result?.sent) {
        const response = result.response;
        if (response.successful !== undefined) {
          this.snackBar.open(
            `Email sent: ${response.successful} successful, ${response.failed} failed`,
            'Close',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            `Email sent to ${response.recipientCount} recipient(s)`,
            'Close',
            { duration: 4000 }
          );
        }
        this.clearSelection();
      }
    });
  }

  emailAll() {
    this.confirmDialog.confirmAction(
      'Send Email to All Members',
      `This will send an email to all ${this.membersWithEmail.length} members with valid email addresses. Do you want to continue?`,
      'Continue',
      'Cancel'
    ).subscribe((confirmed) => {
      if (confirmed) {
        const dialogRef = this.dialog.open(EmailDialogComponent, {
          width: '700px',
          disableClose: false,
          data: {
            sendToAll: true
          } as EmailDialogData
        });

        dialogRef.afterClosed().subscribe((result: EmailDialogResult) => {
          if (result?.sent) {
            const response = result.response;
            if (response.successful !== undefined) {
              this.snackBar.open(
                `Email sent to all members: ${response.successful} successful, ${response.failed} failed`,
                'Close',
                { duration: 5000 }
              );
            } else {
              this.snackBar.open(
                `Email sent to ${response.recipientCount} member(s)`,
                'Close',
                { duration: 4000 }
              );
            }
          }
        });
      }
    });
  }

  getMemberName(member: Member): string {
    return `${member.firstName} ${member.lastName || ''}`.trim();
  }
}
