import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { OffersDashboard } from './offers-dashboard';

describe('OffersDashboard', () => {
  let component: OffersDashboard;
  let fixture: ComponentFixture<OffersDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffersDashboard],
      providers: [provideMockStore({})]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OffersDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
