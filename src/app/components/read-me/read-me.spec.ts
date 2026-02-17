import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ReadMe } from './read-me';

describe('ReadMe', () => {
  let component: ReadMe;
  let fixture: ComponentFixture<ReadMe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadMe],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null }, queryParams: {} },
            paramMap: of(new Map()),
            queryParams: of({})
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReadMe);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
