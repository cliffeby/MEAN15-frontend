import { Component, inject, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { EmailService } from '../../../services/email.service';

export interface EmailDialogData {
  memberIds?: string[]; // If provided, send to specific members
  sendToAll?: boolean;  // If true, send to all members
  memberNames?: string[]; // Display names in dialog
}

export interface EmailDialogResult {
  sent: boolean;
  response?: any;
}

@Component({
  selector: 'app-email-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './email-dialog.html',
  styleUrls: ['./email-dialog.scss']
})
export class EmailDialogComponent {
  private emailService = inject(EmailService);
  private dialogRef = inject(MatDialogRef<EmailDialogComponent>);
  
  // Form fields
  subject = signal('');
  message = signal('');
  personalize = signal(true);
  includeHidden = signal(false);
  previewMode = signal(false);
  
  // State
  sending = signal(false);
  error = signal<string | null>(null);
  
  constructor(@Inject(MAT_DIALOG_DATA) public data: EmailDialogData) {}

  get isSendToAll(): boolean {
    return this.data.sendToAll || false;
  }

  get recipientCount(): number {
    return this.data.memberNames?.length || 0;
  }

  get isValid(): boolean {
    return this.subject().trim() !== '' && this.message().trim() !== '';
  }

  get displayRecipients(): string[] {
    return this.data.memberNames?.slice(0, 10) || [];
  }

  get hasMoreRecipients(): boolean {
    return (this.data.memberNames?.length || 0) > 10;
  }

  get additionalRecipients(): number {
    return (this.data.memberNames?.length || 0) - 10;
  }

  insertPlaceholder(placeholder: string): void {
    const currentMessage = this.message();
    this.message.set(currentMessage + placeholder);
  }

  togglePreview(): void {
    this.previewMode.update(v => !v);
  }

  getPreviewHtml(): string {
    // Simple preview - replace placeholders with example values
    return this.message()
      .replace(/{{firstName}}/g, '<strong>[FirstName]</strong>')
      .replace(/{{lastName}}/g, '<strong>[LastName]</strong>');
  }

  async sendEmail(): Promise<void> {
    if (!this.isValid || this.sending()) return;

    this.error.set(null);
    this.sending.set(true);

    try {
      // Convert message to HTML (preserve line breaks)
      const htmlContent = this.message()
        .replace(/\n/g, '<br>')
        .trim();

      let response;

      if (this.isSendToAll) {
        // Send to all members
        response = await this.emailService.sendToAllMembers({
          subject: this.subject().trim(),
          htmlContent,
          plainTextContent: this.message().trim(),
          personalize: this.personalize(),
          includeHidden: this.includeHidden()
        }).toPromise();
      } else {
        // Send to specific members
        if (!this.data.memberIds || this.data.memberIds.length === 0) {
          throw new Error('No member IDs provided');
        }

        response = await this.emailService.sendToMembers({
          memberIds: this.data.memberIds,
          subject: this.subject().trim(),
          htmlContent,
          plainTextContent: this.message().trim(),
          personalize: this.personalize()
        }).toPromise();
      }

      this.dialogRef.close({ sent: true, response } as EmailDialogResult);
    } catch (err: any) {
      console.error('Error sending email:', err);
      this.error.set(err.message || 'Failed to send email. Please try again.');
      this.sending.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close({ sent: false } as EmailDialogResult);
  }
}
