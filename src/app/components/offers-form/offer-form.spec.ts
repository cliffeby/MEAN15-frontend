import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffersForm } from './offer-form';

describe('OffersForm', () => {
  let component: OffersForm;
  let fixture: ComponentFixture<OffersForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffersForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OffersForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
