import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-offer-stats',
  standalone: true, 
  imports: [CommonModule, MatCardModule], 
  templateUrl: './offer-stats.html',
  styles: [`
    .stats-card {
      border: 1px solid #ccc;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      background-color: #f5f5f5;
    }
  `]
})
export class OfferStats {
  @Input() totalOffers: number = 0;
  @Input() avgInterestRate: number = 0;

  @Output() refreshStats = new EventEmitter<void>();

  // New EventEmitter to send interest rate for next year
  @Output() interestNextYear = new EventEmitter<number>();

  refresh() {
    this.refreshStats.emit();
  }

  // Calculate next year's interest and emit it
  emitInterestNextYear() {
    const nextYearRate = this.avgInterestRate * 1.05; // example: 5% increase next year
    this.interestNextYear.emit(nextYearRate);
  }
}
