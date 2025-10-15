import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfferListComponent } from './offers-list';

describe('OfferListComponent', () => {
  let component: OfferListComponent;
  let fixture: ComponentFixture<OfferListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfferListComponent as any);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
