import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { OfferListComponent } from './offers-list';

describe('OfferListComponent', () => {
  let component: OfferListComponent;
  let fixture: ComponentFixture<OfferListComponent>;

  beforeEach(async () => {

    const mockActivatedRoute = {
      snapshot: { paramMap: { get: (k: string) => null } }
    };

    await TestBed.configureTestingModule({
      imports: [OfferListComponent],
      providers: [
        provideMockStore({}),
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
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
