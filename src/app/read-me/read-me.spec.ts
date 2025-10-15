import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadMe } from './read-me';

describe('ReadMe', () => {
  let component: ReadMe;
  let fixture: ComponentFixture<ReadMe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadMe]
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
