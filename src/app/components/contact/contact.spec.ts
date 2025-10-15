import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactUsComponent } from './contact';

describe('ContactUsComponent', () => {
  let component: ContactUsComponent;
  let fixture: ComponentFixture<ContactUsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactUsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactUsComponent as any);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
