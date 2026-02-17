import { Component, inject, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { EmailService } from '../../../services/email.service';

export interface EmailDialogData {
  memberIds?: string[]; // If provided, send to specific members
  sendToAll?: boolean;  // If true, send to all members
  memberNames?: string[]; // Display names in dialog
  memberEmails?: string[]; // Optional list of emails corresponding to memberIds
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
    MatChipsModule,
    MatSelectModule
    ,MatCardModule
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
  // Comma-separated CC emails (user-entered)
  cc = signal('');
  personalize = signal(true);
  includeHidden = signal(false);
  previewMode = signal(false);
  // Templates
  templates = [
    {
      id: 'welcome',
      name: 'Welcome New Member',
      subject: 'Welcome to Rochester Golf — Next Steps',
      body:
        'Hi {{firstName}} {{lastName}},\n\n' +
        'Welcome to the Rochester Golf! We\'re excited to have another pigeon on board.\n\n' +
        'Next steps:\n' +
        '- When the weekend matches are scheduled you will get an email. Respond promptly if you plan to participate.\n' +
        '- - You will recieve a confirmation on your status. If you do not, resend your requestReview upcoming events and join a match or practice session.\n\n' +
        'If you have any questions, show up at 8AM and we will be happy to offer insults to your unnecessary questions.\n\n' +
        'Best regards,\n' +
        'Rochester Golf Commish'
    },
    {
      id: 'weekend-schedule',
      name: 'Weekend Schedule',
      // subjectTemplate will be processed to include upcoming Sat/Sun dates
      subjectTemplate: 'Weekend Schedule: Sat {{sat}} — Sun {{sun}}',
      body:
        'Ladies,\n\nPlease see the schedule for the upcoming weekend:\n\n{{snippet}}\n\nBest,\nRochester Golf Commish',
      snippets: [
        { id: 'full', label: 'Full Schedule', text: 'Saturday: 8:30 AM Tee times, Cardroom by 8:00 AM.\nSunday: 8:40 AM shotgun start.' },
        { id: 'reminder', label: 'Quick Reminder', text: 'Reminder: Expected temps are -' },
        { id: 'notes', label: 'Notes', text: 'Notes: Protect the field.' }
      ]
    }
  ];

  selectedTemplateId = signal<string | null>(null);
  // Selected snippets (allow multiple) for templates that support multiple body snippets
  selectedSnippet = signal<string[]>([]);
  // Helper to access currently selected template object
  get currentTemplate() {
    return this.templates.find(t => t.id === this.selectedTemplateId());
  }
  
  // State
  sending = signal(false);
  error = signal<string | null>(null);
  // Failures returned from backend (errors array or invalid count)
  failures = signal<any[] | null>(null);
  ackRequired = signal(false);
  
  public isSendToAll!: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) public data: EmailDialogData) {
    this.isSendToAll = !!this.data?.sendToAll;
    // If memberEmails provided, prefill CC with those emails (comma-separated)
    if (this.data?.memberEmails && this.data.memberEmails.length > 0) {
      // Prefill CC with the provided emails
      this.cc.set(this.data.memberEmails.join(', '));
    }
  }

  get recipientCount(): number {
    return this.data.memberNames?.length || 0;
  }

  get isValid(): boolean {
    return this.subject().trim() !== '' && this.message().trim() !== '';
  }

  get displayRecipients(): string[] {
    const names = this.data.memberNames || [];
    // Sort alphabetically, case-insensitive, then take first 10
    return names.slice().sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).slice(0, 10);
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

  selectTemplate(templateId: string): void {
    const t = this.templates.find(x => x.id === templateId);
    if (!t) return;
    // Apply template (admin can still edit afterwards)
    this.selectedTemplateId.set(templateId);
    // If the template provides a subjectTemplate (with placeholders), compute dates
    if ((t as any).subjectTemplate) {
      const sat = this.formatUpcomingDateForWeekday(6); // Saturday
      const sun = this.formatUpcomingDateForWeekday(0); // Sunday
      const subj = (t as any).subjectTemplate.replace('{{sat}}', sat).replace('{{sun}}', sun);
      this.subject.set(subj);
    } else if ((t as any).subject) {
      this.subject.set((t as any).subject);
    }

    // If template has snippets, select the first by default and apply
    if ((t as any).snippets && (t as any).snippets.length > 0) {
      const firstId = (t as any).snippets[0].id;
      this.selectedSnippet.set([firstId]);
      this.applySnippetToMessage(t, [firstId]);
    } else {
      this.selectedSnippet.set([]);
      this.message.set((t as any).body || '');
    }
  }
  onSnippetChange(snippetIds: string[] | null): void {
    const ids = snippetIds || [];
    const t = this.currentTemplate as any;
    if (!t) return;
    this.selectedSnippet.set(ids);
    this.applySnippetToMessage(t, ids);
  }

  private applySnippetToMessage(tpl: any, snippetIds: string[]): void {
    const texts = (snippetIds || []).map((id: string) => tpl.snippets?.find((s: any) => s.id === id)?.text || '').filter((t: string) => !!t);
    const combined = texts.join('\n\n');
    const body = (tpl.body || '').replace('{{snippet}}', combined);
    this.message.set(body);
  }

  private formatUpcomingDateForWeekday(targetWeekday: number): string {
    const today = new Date();
    const todayDay = today.getDay(); // 0 = Sun ... 6 = Sat
    let diff = (targetWeekday - todayDay + 7) % 7;
    // If diff === 0, use today (upcoming)
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  togglePreview(): void {
    this.previewMode.update(v => !v);
  }

  getPreviewHtml(): string {
    // Simple preview - replace placeholders with example values
    const replaced = this.message()
      .replace(/{{firstName}}/g, '<strong>[FirstName]</strong>')
      .replace(/{{lastName}}/g, '<strong>[LastName]</strong>');
    // Preserve line breaks in HTML preview
    return replaced.replace(/\n/g, '<br>');
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

      // Parse CC emails into array (trim, remove empties)
      const ccEmails = (this.cc() || '')
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (this.isSendToAll) {
        // Send to all members
        response = await this.emailService.sendToAllMembers({
          subject: this.subject().trim(),
          htmlContent,
          plainTextContent: this.message().trim(),
          personalize: this.personalize(),
          includeHidden: this.includeHidden(),
          cc: ccEmails
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
          personalize: this.personalize(),
          cc: ccEmails
        }).toPromise();
      }

      // If the API returned no response object, close and return
      if (!response) {
        this.dialogRef.close({ sent: true, response } as EmailDialogResult);
        return;
      }

      // If response contains failures, show them and require user acknowledgement
      const hasErrors = ((response.errors?.length ?? 0) > 0) || ((response.invalidEmails ?? 0) > 0) || ((response.failed ?? 0) > 0);
      if (hasErrors) {
        // Normalize failures array
        const errs = response.errors ? [...response.errors] : [];
        // If only invalidEmails present, create a summary entry
        if (errs.length === 0 && (response.invalidEmails ?? 0) > 0) {
          errs.push({ email: 'unknown', error: `${response.invalidEmails} invalid email(s)` });
        }
        this.failures.set(errs);
        this.ackRequired.set(true);
        this.sending.set(false);
        return;
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

  acknowledgeAndClose(): void {
    const resp = { acknowledged: true, errors: this.failures() };
    this.dialogRef.close({ sent: true, response: resp } as EmailDialogResult);
  }
}
