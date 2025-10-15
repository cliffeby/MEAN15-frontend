import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Offer } from '../../models/offer';
import { loadOffers, deleteOffer } from '../../store/actions/offer.actions';
import { selectAllOffers } from '../../store/selectors/offer.selectors';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-offer-list',
  templateUrl: './offers-list.html',
  styleUrls: ['./offers-list.scss'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class OfferListComponent implements OnInit, OnDestroy {
  offers$!: Observable<Offer[]>;
  dataSource = new MatTableDataSource<Offer>();
  displayedColumns: string[] = ['title', 'description', 'interestRate', 'validTill', 'actions'];

  private unsubscribe$ = new Subject<void>(); // <-- Subject to handle unsubscribe

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(loadOffers());
    this.offers$ = this.store.select(selectAllOffers);

    // Subscribe with takeUntil to auto-unsubscribe on destroy
    this.offers$.pipe(takeUntil(this.unsubscribe$)).subscribe((offers) => {
      this.dataSource.data = offers;
    });
  }

  onDelete(id: string) {
    if (confirm('Are you sure you want to delete this offer?')) {
      this.store.dispatch(deleteOffer({ id }));
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next(); // <-- trigger unsubscribe
    this.unsubscribe$.complete(); // <-- complete the subject
  }
}
