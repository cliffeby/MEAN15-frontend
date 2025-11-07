import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  color?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon *ngIf="data.icon" [class]="'icon-' + (data.color || 'primary')">
          {{ data.icon }}
        </mat-icon>
        {{ data.title }}
      </h2>
      
      <div mat-dialog-content class="dialog-content">
        <p>{{ data.message }}</p>
      </div>
      
      <div mat-dialog-actions class="dialog-actions">
        <button 
          mat-button 
          (click)="onCancel()"
          class="cancel-button">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button 
          mat-raised-button 
          [color]="data.color || 'warn'"
          (click)="onConfirm()"
          class="confirm-button">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 300px;
      max-width: 500px;
    }
    
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-weight: 500;
    }
    
    .icon-primary {
      color: var(--mdc-theme-primary);
    }
    
    .icon-accent {
      color: var(--mdc-theme-secondary);
    }
    
    .icon-warn {
      color: var(--mdc-theme-error);
    }
    
    .dialog-content {
      margin-bottom: 24px;
    }
    
    .dialog-content p {
      margin: 0;
      color: rgba(0, 0, 0, 0.7);
      line-height: 1.5;
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin: 0;
      padding: 0;
    }
    
    .cancel-button {
      min-width: 80px;
    }
    
    .confirm-button {
      min-width: 80px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}