import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import * as OfferActions from '../actions/offer.actions';
import { Offer } from '../../models/offer';

// State definition
export interface OfferState extends EntityState<Offer> {
  loading: boolean;
  error: any | null;
}

// Entity adapter
export const adapter: EntityAdapter<Offer> = createEntityAdapter<Offer>({
  selectId: (offer: Offer) => offer.id || '',
});

// Initial state
export const initialState: OfferState = adapter.getInitialState({
  loading: false,
  error: null,
});

// Reducer
export const offerReducer = createReducer(
  initialState,

  // Load
  on(OfferActions.loadOffers, (state) => ({ ...state, loading: true })),
  on(OfferActions.loadOffersSuccess, (state, { offers }) =>
    adapter.setAll(offers, { ...state, loading: false, error: null })
  ),
  on(OfferActions.loadOffersFailure, (state, { error }) => ({ ...state, loading: false, error })),

  // Create
  on(OfferActions.createOfferSuccess, (state, { offer }) =>
    adapter.addOne(offer, { ...state, error: null })
  ),
  on(OfferActions.createOfferFailure, (state, { error }) => ({ ...state, error })),

  // Update
  on(OfferActions.updateOfferSuccess, (state, { offer }) =>
    adapter.upsertOne(offer, { ...state, error: null })
  ),
  on(OfferActions.updateOfferFailure, (state, { error }) => ({ ...state, error })),

  // Delete
  on(OfferActions.deleteOfferSuccess, (state, { id }) =>
    adapter.removeOne(id, { ...state, error: null })
  ),
  on(OfferActions.deleteOfferFailure, (state, { error }) => ({ ...state, error })),
);

// Adapter selectors
export const { selectAll, selectEntities, selectIds, selectTotal } = adapter.getSelectors();
