import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { OffersService } from '../../services/offer';
import * as OffersActions from '../actions/offer.actions';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class OffersEffects {
  constructor(private actions$: Actions, private offersService: OffersService) {}

  loadOffers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OffersActions.loadOffers),
      mergeMap(() =>
        this.offersService.getOffers().pipe(
          map((offers) => OffersActions.loadOffersSuccess({ offers })),
          catchError((error) => of(OffersActions.loadOffersFailure({ error })))
        )
      )
    )
  );

  createOffer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OffersActions.createOffer),
      mergeMap((action) =>
        this.offersService.createOffer(action.offer).pipe(
          map((offer) => OffersActions.createOfferSuccess({ offer })),
          catchError((error) => of(OffersActions.createOfferFailure({ error })))
        )
      )
    )
  );

  updateOffer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OffersActions.updateOffer),
      mergeMap((action) =>
        this.offersService.updateOffer(action.id, action.offer).pipe(
          map((offer) => OffersActions.updateOfferSuccess({ offer })),
          catchError((error) => of(OffersActions.updateOfferFailure({ error })))
        )
      )
    )
  );

  deleteOffer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OffersActions.deleteOffer),
      mergeMap((action) =>
        this.offersService.deleteOffer(action.id).pipe(
          map(() => OffersActions.deleteOfferSuccess({ id: action.id })),
          catchError((error) => of(OffersActions.deleteOfferFailure({ error })))
        )
      )
    )
  );
}
