import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/shared/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {

  constructor(private dialog: MatDialog) {}

  /**
   * Opens a confirmation dialog
   * @param data Configuration for the dialog
   * @returns Observable<boolean> - true if confirmed, false if cancelled
   */
  confirm(data: ConfirmDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      disableClose: false,
      data: data
    });

    return dialogRef.afterClosed();
  }

  /**
   * Quick delete confirmation dialog
   * @param itemName Name of the item being deleted
   * @param itemType Type of item (e.g., 'scorecard', 'match', 'score')
   * @returns Observable<boolean>
   */
  confirmDelete(itemName: string, itemType: string): Observable<boolean> {
    return this.confirm({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      icon: 'delete_forever',
      color: 'warn'
    });
  }

  /**
   * Quick generic confirmation dialog
   * @param title Dialog title
   * @param message Dialog message
   * @param confirmText Text for confirm button (default: 'Confirm')
   * @param cancelText Text for cancel button (default: 'Cancel')
   * @returns Observable<boolean>
   */
  confirmAction(
    title: string, 
    message: string, 
    confirmText: string = 'Confirm', 
    cancelText: string = 'Cancel'
  ): Observable<boolean> {
    return this.confirm({
      title,
      message,
      confirmText,
      cancelText,
      icon: 'help_outline',
      color: 'primary'
    });
  }
}