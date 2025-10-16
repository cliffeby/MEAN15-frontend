import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { OfferStats } from './offer-stats';

describe('OfferStats', () => {
  let component: OfferStats;
  let fixture: ComponentFixture<OfferStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferStats],
      providers: [provideMockStore({})]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfferStats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
