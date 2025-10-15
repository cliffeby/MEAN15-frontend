import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Offer } from '../../models/offer';
import { selectAllOffers } from '../../store/selectors/offer.selectors';
import { OfferStats } from '../offer-stats/offer-stats';
import { loadOffers } from '../../store/actions/offer.actions';

@Component({
  selector: 'app-offer-dashboard',
  standalone: true,
  imports: [CommonModule, OfferStats],
  templateUrl: 'offers-dashboard.html' 
})
export class OffersDashboard implements OnInit, OnDestroy {
  offers$!: Observable<Offer[]>;
  totalOffers: number = 0;
  avgInterestRate: number = 0;

  nextYearInterest: number = 0; // <-- store child data


  private unsubscribe$ = new Subject<void>(); // <-- to handle unsubscribe

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(loadOffers());
    this.offers$ = this.store.select(selectAllOffers);

    this.offers$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((offers) => {
        this.totalOffers = offers.length;
        this.avgInterestRate =
          offers.reduce((sum, o) => sum + o.interestRate, 0) / (offers.length || 1);
      });
  }

  onRefreshStats() {
    console.log('Refresh Stats triggered from child!');
    
    this.offers$.subscribe((offers) => {
      this.totalOffers = offers.length;
      this.avgInterestRate =
        offers.reduce((sum, o) => sum + o.interestRate, 0) / (offers.length || 1);
    });
  }

  onInterestNextYear(rate: number) {
    this.nextYearInterest = rate; // <-- receive value from child
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
  
}
