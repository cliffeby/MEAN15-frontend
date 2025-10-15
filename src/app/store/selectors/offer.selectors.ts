import { createFeatureSelector, createSelector } from '@ngrx/store';
import { OfferState, selectAll } from '../reducers/offer.reducer';

// Feature key
export const OFFER_FEATURE_KEY = 'offers';

// Base selector for feature state
export const selectOfferState = createFeatureSelector<OfferState>(OFFER_FEATURE_KEY);

// Select all offers
export const selectAllOffers = createSelector(selectOfferState, selectAll);

// Select single offer by ID
export const selectOfferById = (id: string) =>
  createSelector(selectOfferState, (state: OfferState) => state.entities[id]);

// Loading flag
export const selectOffersLoading = createSelector(
  selectOfferState,
  (state: OfferState) => state.loading
);

// Error
export const selectOffersError = createSelector(
  selectOfferState,
  (state: OfferState) => state.error
);

// Count
export const selectOfferCount = createSelector(
  selectOfferState,
  (state: OfferState) => state.ids.length
);
