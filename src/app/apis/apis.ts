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
    // Auth Endpoints
    {
      endpoint: '/api/auth/register',
      method: 'POST',
      description: 'Register a new user',
      request: '{ "email": "string", "password": "string", "role": "admin|user" }',
      response: '{ "success": true, "token": "JWT token", "user": {...} }'
    },
    {
      endpoint: '/api/auth/login',
      method: 'POST',
      description: 'Login user (Admin or Customer)',
      request: '{ "email": "string", "password": "string" }',
      response: '{ "success": true, "token": "JWT token", "user": {...} }'
    },
    {
      endpoint: '/api/auth/me',
      method: 'GET',
      description: 'Get current user profile (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "user": {...} }'
    },

    // Member Endpoints
    {
      endpoint: '/api/members',
      method: 'GET',
      description: 'Get all members (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "count": number, "members": [...] }'
    },
    {
      endpoint: '/api/members/:id',
      method: 'GET',
      description: 'Get single member by ID (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "member": {...} }'
    },
    {
      endpoint: '/api/members',
      method: 'POST',
      description: 'Create new member (admin only)',
      request: '{ "firstName": "string", "lastName": "string", "email": "string", "usgaIndex": number, ... , "author": { "id": "string", "email": "string", "name": "string" } }',
      response: '{ "success": true, "member": {...} }'
    },
    {
      endpoint: '/api/members/:id',
      method: 'PUT',
      description: 'Update member (admin only)',
      request: '{ "firstName": "string", "lastName": "string", ... , "author": { "id": "string", "email": "string", "name": "string" } }',
      response: '{ "success": true, "member": {...} }'
    },
    {
      endpoint: '/api/members/:id',
      method: 'DELETE',
      description: 'Delete member (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "message": "Member deleted" }'
    },
    {
      endpoint: '/api/members/duplicates/remove',
      method: 'DELETE',
      description: 'Remove duplicate email addresses (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "removed": number }'
    },

    // Match Endpoints
    {
      endpoint: '/api/matches',
      method: 'GET',
      description: 'Get all matches (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "matches": [...] }'
    },
    {
      endpoint: '/api/matches/:id',
      method: 'GET',
      description: 'Get single match by ID (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "match": {...} }'
    },
    {
      endpoint: '/api/matches',
      method: 'POST',
      description: 'Create new match (admin only)',
      request: '{ "name": "string", "scGroupName": "string", "datePlayed": "ISO date", "status": "open|completed", "scorecardId": "string", "author": { "id": "string", "email": "string", "name": "string" }, ... }',
      response: '{ "success": true, "match": {...} }'
    },
    {
      endpoint: '/api/matches/:id',
      method: 'PUT',
      description: 'Update match (admin only)',
      request: '{ ...match fields..., "author": { "id": "string", "email": "string", "name": "string" } }',
      response: '{ "success": true, "match": {...} }'
    },
    {
      endpoint: '/api/matches/:id/status',
      method: 'PATCH',
      description: 'Update match status (admin only)',
      request: '{ "status": "open|completed" }',
      response: '{ "success": true, "match": {...} }'
    },
    {
      endpoint: '/api/matches/:id',
      method: 'DELETE',
      description: 'Delete match (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "message": "Match deleted" }'
    },
    {
      endpoint: '/api/matches/user/:userId',
      method: 'GET',
      description: 'Get matches for a specific user',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "matches": [...] }'
    },
    {
      endpoint: '/api/matches/status/:status',
      method: 'GET',
      description: 'Get matches filtered by status',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "matches": [...] }'
    },

    // Score Endpoints
    {
      endpoint: '/api/scores',
      method: 'GET',
      description: 'Get all scores (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "count": number, "scores": [...] }'
    },
    {
      endpoint: '/api/scores/:id',
      method: 'GET',
      description: 'Get single score by ID (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "score": {...} }'
    },
    {
      endpoint: '/api/scores/member/:memberId',
      method: 'GET',
      description: 'Get all scores for a specific member (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "count": number, "scores": [...] }'
    },
    {
      endpoint: '/api/scores/match/:matchId',
      method: 'GET',
      description: 'Get all scores for a specific match (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "count": number, "scores": [...] }'
    },
    {
      endpoint: '/api/scores/scorecard/:scorecardId',
      method: 'GET',
      description: 'Get all scores for a specific scorecard (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "count": number, "scores": [...] }'
    },
    {
      endpoint: '/api/scores',
      method: 'POST',
      description: 'Create new score (admin only)',
      request: '{ "name": "string", "score": number, "handicap": number, "memberId": "ObjectId", "matchId": "ObjectId", ... }',
      response: '{ "success": true, "score": {...} }'
    },
    {
      endpoint: '/api/scores/:id',
      method: 'PUT',
      description: 'Update score (admin only)',
      request: '{ "score": number, "handicap": number, ... }',
      response: '{ "success": true, "score": {...} }'
    },
    {
      endpoint: '/api/scores/:id',
      method: 'DELETE',
      description: 'Delete score (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "message": "Score deleted" }'
    },

    // Scorecard Endpoints
    {
      endpoint: '/api/scorecards',
      method: 'GET',
      description: 'Get all scorecards (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "count": number, "scorecards": [...] }'
    },
    {
      endpoint: '/api/scorecards/:id',
      method: 'GET',
      description: 'Get single scorecard by ID (requires auth)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "scorecard": {...} }'
    },
    {
      endpoint: '/api/scorecards',
      method: 'POST',
      description: 'Create new scorecard (admin only)',
      request: '{ "name": "string", "slope": number, "rating": number, "pars": [number], ... }',
      response: '{ "success": true, "scorecard": {...} }'
    },
    {
      endpoint: '/api/scorecards/:id',
      method: 'PUT',
      description: 'Update scorecard (admin only)',
      request: '{ "name": "string", "slope": number, "rating": number, ... }',
      response: '{ "success": true, "scorecard": {...} }'
    },
    {
      endpoint: '/api/scorecards/:id',
      method: 'DELETE',
      description: 'Delete scorecard (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "message": "Scorecard deleted" }'
    },

    // User Management Endpoints
    {
      endpoint: '/api/users',
      method: 'GET',
      description: 'Get all users (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "count": number, "users": [...] }'
    },
    {
      endpoint: '/api/users/:id',
      method: 'DELETE',
      description: 'Delete user by ID (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "message": "User deleted" }'
    },

    // Orphan Management Endpoints
    {
      endpoint: '/api/orphans/report',
      method: 'GET',
      description: 'Get orphaned records report (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "orphanScores": [...], "count": number }'
    },
    {
      endpoint: '/api/orphans/find',
      method: 'GET',
      description: 'Find orphaned scores (admin only)',
      request: 'Headers: { "Authorization": "Bearer <token>" }',
      response: '{ "success": true, "orphans": [...] }'
    },
    {
      endpoint: '/api/orphans/cleanup',
      method: 'POST',
      description: 'Clean up orphaned records (admin only)',
      request: '{ "confirm": true }',
      response: '{ "success": true, "deletedCount": number, "message": "..." }'
    }
  ];
}

