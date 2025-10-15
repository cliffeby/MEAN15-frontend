import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { createOffer, updateOffer } from '../../store/actions/offer.actions';
import { selectOfferById } from '../../store/selectors/offer.selectors';
import { Offer } from '../../models/offer';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-offer-form',
  templateUrl: './offer-form.html',
  styleUrls: ['./offer-form.scss'],
  imports: [
    RouterModule,
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class OffersForm implements OnInit, OnDestroy {
  offerForm: FormGroup;
  offerId: string | null = null;
  offer$!: Observable<Offer | undefined>;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    public router: Router,
    private route: ActivatedRoute
  ) {
    this.offerForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      interestRate: [0, [Validators.required, Validators.min(0)]],
      validTill: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.offerId = this.route.snapshot.paramMap.get('id');

    if (this.offerId) {
      this.offer$ = this.store.select(selectOfferById(this.offerId));

      this.offer$.pipe(takeUntil(this.unsubscribe$)).subscribe((offer) => {
        if (offer) {
          this.offerForm.patchValue({
            title: offer.title,
            description: offer.description,
            interestRate: offer.interestRate,
            validTill: offer.validTill
              ? new Date(offer.validTill).toISOString().substring(0, 10)
              : ''
          });
        }
      });
    }
  }

  onSubmit(): void {
    if (this.offerForm.invalid) return;

    const formValue = this.offerForm.value;
    const offer: Offer = {
      ...formValue,
      validTill: new Date(formValue.validTill)
    };

    if (this.offerId) {
      this.store.dispatch(updateOffer({ id: this.offerId, offer }));
    } else {
      this.store.dispatch(createOffer({ offer }));
    }

    this.router.navigate(['/offers']);
  }

  ngOnDestroy(): void {
    // Trigger unsubscribe for all subscriptions
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
