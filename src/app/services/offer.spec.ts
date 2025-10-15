import { TestBed } from '@angular/core/testing';

import { OffersService } from './offer';

describe('OffersService', () => {
  let service: OffersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OffersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
