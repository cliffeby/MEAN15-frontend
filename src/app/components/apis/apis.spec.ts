import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API } from './apis';

describe('APIs', () => {
  let component: API;
  let fixture: ComponentFixture<API>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [API]
    })
    .compileComponents();

    fixture = TestBed.createComponent(API);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
