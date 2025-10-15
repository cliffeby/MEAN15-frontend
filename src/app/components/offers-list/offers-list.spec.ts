import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffersList } from './offers-list';

describe('OffersList', () => {
  let component: OffersList;
  let fixture: ComponentFixture<OffersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffersList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OffersList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
