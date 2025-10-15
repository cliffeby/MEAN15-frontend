import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumeNotes } from './resume-notes';

describe('ResumeNotes', () => {
  let component: ResumeNotes;
  let fixture: ComponentFixture<ResumeNotes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeNotes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumeNotes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
