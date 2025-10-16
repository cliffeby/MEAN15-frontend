import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { Login } from './login';
import { Auth } from '../../services/auth';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    const mockAuth = {
      login: (email: string, password: string) => of({ token: 'fake' }),
      role: 'user',
      payload: () => ({ id: 'u1', name: 'Test' })
    } as Partial<Auth> as Auth;

    const mockRouter = { navigate: (commands: any[]) => Promise.resolve(true) } as Partial<Router> as Router;

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: Auth, useValue: mockAuth },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
