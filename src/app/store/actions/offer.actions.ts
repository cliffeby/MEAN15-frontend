import { createAction, props } from '@ngrx/store';
import { Offer } from '../../models/offer';

// Load all offers
export const loadOffers = createAction('[Offer] Load Offers');
export const loadOffersSuccess = createAction('[Offer] Load Offers Success', props<{ offers: Offer[] }>());
export const loadOffersFailure = createAction('[Offer] Load Offers Failure', props<{ error: any }>());

// Create
export const createOffer = createAction('[Offer] Create Offer', props<{ offer: Offer }>());
export const createOfferSuccess = createAction('[Offer] Create Offer Success', props<{ offer: Offer }>());
export const createOfferFailure = createAction('[Offer] Create Offer Failure', props<{ error: any }>());

// Update
export const updateOffer = createAction(
    '[Offer] Update Offer',
    props<{ id: string; offer: Offer }>()
  );
export const updateOfferSuccess = createAction('[Offer] Update Offer Success', props<{ offer: Offer }>());
export const updateOfferFailure = createAction('[Offer] Update Offer Failure', props<{ error: any }>());

// Delete
export const deleteOffer = createAction('[Offer] Delete Offer', props<{ id: string }>());
export const deleteOfferSuccess = createAction('[Offer] Delete Offer Success', props<{ id: string }>());
export const deleteOfferFailure = createAction('[Offer] Delete Offer Failure', props<{ error: any }>());
