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
    // Loans Endpoints
    {
      endpoint: '/api/loans',
      method: 'GET',
      description: 'Get all loans (admin only)',
      request: '{}',
      response: '{ "success": true, "count": number, "loans": [ { loan fields } ] }'
    },
    {
      endpoint: '/api/loans',
      method: 'POST',
      description: 'Create a new loan',
      request: '{ "customerId": "string", "amount": number, "termMonths": number, "interestRate": number, "status": "pending|approved|declined" }',
      response: '{ "success": true, "loan": { loan fields } }'
    },
    {
      endpoint: '/api/loans/:id',
      method: 'GET',
      description: 'Get single loan by ID',
      request: '{}',
      response: '{ "success": true, "loan": { loan fields } }'
    },
    {
      endpoint: '/api/loans/:id',
      method: 'PUT',
      description: 'Update a loan by ID',
      request: '{ "amount"?: number, "termMonths"?: number, "interestRate"?: number, "status"?: "pending|approved|declined" }',
      response: '{ "success": true, "loan": { updated loan fields } }'
    },
    {
      endpoint: '/api/loans/:id/status',
      method: 'PATCH',
      description: 'Update only the loan status',
      request: '{ "status": "pending|approved|declined" }',
      response: '{ "success": true, "loan": { updated loan fields } }'
    },
    {
      endpoint: '/api/loans/:id',
      method: 'DELETE',
      description: 'Delete a loan (admin only)',
      request: '{}',
      response: '{ "success": true, "message": "Loan deleted successfully" }'
    },

    // Offers Endpoints
    {
      endpoint: '/api/offers',
      method: 'GET',
      description: 'Get all offers',
      request: '{}',
      response: '{ "success": true, "count": number, "offers": [ { offer fields } ] }'
    },
    {
      endpoint: '/api/offers',
      method: 'POST',
      description: 'Create a new offer',
      request: '{ "title": "string", "description": "string", "interestRate": number, "validTill": "date" }',
      response: '{ "success": true, "offer": { offer fields } }'
    },
    {
      endpoint: '/api/offers/:id',
      method: 'GET',
      description: 'Get single offer by ID',
      request: '{}',
      response: '{ "success": true, "offer": { offer fields } }'
    },
    {
      endpoint: '/api/offers/:id',
      method: 'PUT',
      description: 'Update an offer by ID',
      request: '{ "title"?: "string", "description"?: "string", "interestRate"?: number, "validTill"?: "date" }',
      response: '{ "success": true, "offer": { updated offer fields } }'
    },
    {
      endpoint: '/api/offers/:id',
      method: 'DELETE',
      description: 'Delete an offer by ID',
      request: '{}',
      response: '{ "success": true, "message": "Offer deleted successfully" }'
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

