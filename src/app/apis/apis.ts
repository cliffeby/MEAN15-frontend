import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-resume-endpoints',
  imports: [MatCardModule, MatTableModule],
  templateUrl: './apis.html',
  styleUrls: ['./apis.scss']
})
export class API {
  endpoints = [
    {
      endpoint: '/api/auth/login',
      method: 'POST',
      description: 'Login user (Admin or Customer)',
      request: '{ "email": "string", "password": "string" }',
      response: '{ "token": "JWT token string" }'
    },
    {
      endpoint: '/api/auth/register',
      method: 'POST',
      description: 'Register a new user',
      request: '{ "name": "string", "email": "string", "password": "string", "role": "admin|user" }',
      response: '{ "token": "JWT token string" }'
    },

    // Contact Endpoint
    {
      endpoint: '/api/contact',
      method: 'POST',
      description: 'Submit a contact-us form',
      request: '{ "name": "string", "email": "string", "message": "string" }',
      response: '{ "success": true, "message": "Your message has been sent successfully" }'
    }
  ];
}

