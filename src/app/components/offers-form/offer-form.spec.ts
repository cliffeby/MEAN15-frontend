import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { OffersForm } from './offer-form';
import { ActivatedRoute, Router } from '@angular/router';

describe('OffersForm', () => {
  let component: OffersForm;
  let fixture: ComponentFixture<OffersForm>;

  beforeEach(async () => {
    const mockActivatedRoute: Partial<ActivatedRoute> = {
      snapshot: { paramMap: { get: (k: string) => null } as any } as any
    };

    const mockRouter: Partial<Router> = {
      navigate: (commands: any[]) => Promise.resolve(true)
    } as Partial<Router> as Router;

    await TestBed.configureTestingModule({
      imports: [OffersForm],
      providers: [
        provideMockStore({}),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter }
      ]
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
