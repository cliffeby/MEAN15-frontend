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
  templateUrl: './conflict-dialog.component.html',
  styleUrls: ['./conflict-dialog.component.scss']
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