import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

export interface ConflictDialogData {
  title: string;
  message: string;
  conflictDetails: {
    conflictType: string;
    conflictCount: number;
    scores?: any[];
    options: {
      nullify: string;
      delete: string;
      cancel: string;
    };
  };
}

export interface ConflictDialogResult {
  action: 'nullify' | 'delete' | 'cancel';
}

@Component({
  selector: 'app-conflict-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="conflict-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="warning-icon">warning</mat-icon>
        {{ data.title }}
      </h2>
      
      <mat-dialog-content class="dialog-content">
        <p class="conflict-message">{{ data.message }}</p>
        
        <div class="conflict-details">
          <h3>Conflict Details</h3>
          <p>
            <strong>Type:</strong> {{ data.conflictDetails.conflictType | titlecase }}
            <br>
            <strong>Count:</strong> {{ data.conflictDetails.conflictCount }} 
            {{ data.conflictDetails.conflictType }} would be affected
          </p>
          
          <div *ngIf="data.conflictDetails.scores?.length" class="affected-items">
            <h4>Affected Scores:</h4>
            <ul class="score-list">
              <li *ngFor="let score of data.conflictDetails.scores" class="score-item">
                <strong>{{ score.name }}</strong>
                <span class="score-details">
                  ({{ score.datePlayed | date:'shortDate' }}, Score: {{ score.score }})
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        <div class="options-section">
          <h3>How would you like to proceed?</h3>
          <div class="options">
            <mat-card class="option-card nullify-option" (click)="selectAction('nullify')">
              <mat-card-header>
                <mat-icon mat-card-avatar>link_off</mat-icon>
                <mat-card-title>Remove References</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                {{ data.conflictDetails.options.nullify }}
              </mat-card-content>
            </mat-card>
            
            <mat-card class="option-card delete-option" (click)="selectAction('delete')">
              <mat-card-header>
                <mat-icon mat-card-avatar>delete_forever</mat-icon>
                <mat-card-title>Delete All</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                {{ data.conflictDetails.options.delete }}
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="selectAction('cancel')">
          <mat-icon>cancel</mat-icon>
          Cancel
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .conflict-dialog {
      width: 600px;
      max-width: 90vw;
    }
    
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f57c00;
      margin-bottom: 16px;
    }
    
    .warning-icon {
      color: #f57c00;
      font-size: 24px;
    }
    
    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }
    
    .conflict-message {
      font-size: 16px;
      margin-bottom: 20px;
    }
    
    .conflict-details {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .conflict-details h3,
    .conflict-details h4 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #424242;
    }
    
    .score-list {
      list-style: none;
      padding: 0;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .score-item {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .score-item:last-child {
      border-bottom: none;
    }
    
    .score-details {
      font-size: 12px;
      color: #666;
    }
    
    .options-section h3 {
      margin-bottom: 16px;
      color: #424242;
    }
    
    .options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .option-card {
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }
    
    .option-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .nullify-option:hover {
      border-color: #2196f3;
    }
    
    .delete-option:hover {
      border-color: #f44336;
    }
    
    .option-card mat-card-header {
      margin-bottom: 8px;
    }
    
    .option-card mat-icon {
      color: #666;
    }
    
    .nullify-option:hover mat-icon {
      color: #2196f3;
    }
    
    .delete-option:hover mat-icon {
      color: #f44336;
    }
    
    .dialog-actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
    
    @media (max-width: 768px) {
      .options {
        grid-template-columns: 1fr;
      }
      
      .conflict-dialog {
        width: 100%;
        margin: 0;
      }
    }
  `]
})
export class ConflictDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConflictDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConflictDialogData
  ) {}

  selectAction(action: 'nullify' | 'delete' | 'cancel'): void {
    this.dialogRef.close({ action });
  }
}