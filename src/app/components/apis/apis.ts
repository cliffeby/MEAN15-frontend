import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-resume-endpoints',
  imports: [MatCardModule, MatTableModule, MatButtonModule, RouterModule],
  templateUrl: './apis.html',
  styleUrls: ['./apis.scss']
})
export class API {
  endpoints = [
    { endpoint: '/', method: 'GET', description: 'Health check', request: '', response: '{ "status": "ok" }' },
    { endpoint: '/api', method: 'GET', description: 'API root; general API entry point (requires auth)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "message": "API root", "available": [...] }' },
    { endpoint: '/api/audit/logs', method: 'GET', description: 'Get audit logs (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "logs": [...], "count": number }' },
    { endpoint: '/api/auth/login', method: 'POST', description: 'Login user', request: '{ "email": "string", "password": "string" }', response: '{ "success": true, "token": "JWT token", "user": {...} }' },
    { endpoint: '/api/auth/me', method: 'GET', description: 'Get current user profile (requires auth)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "user": {...} }' },
    { endpoint: '/api/auth/register', method: 'POST', description: 'Register a new user', request: '{ "email": "string", "password": "string", "role": "admin|user" }', response: '{ "success": true, "token": "JWT token", "user": {...} }' },
    { endpoint: '/api/config/db-type', method: 'GET', description: 'Detect DB type (local/azure/atlas)', request: '', response: '{ "dbType": "Local|Atlas|AzureCosmos|Unknown", "dbName": "string" }' },
    { endpoint: '/api/config/default-league', method: 'GET', description: 'Get default league from server config (requires auth)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "defaultLeague": "string" }' },
    { endpoint: '/api/email/send', method: 'POST', description: 'Send email to specific members (admin only)', request: '{ "memberIds": ["id"], "subject": "string", "htmlContent": "string", "personalize": boolean }', response: '{ "success": true, "successful": number, "failed": number, "errors": [...] }' },
    { endpoint: '/api/email/send-all', method: 'POST', description: 'Send email to all members with emails (admin only)', request: '{ "subject": "string", "htmlContent": "string", "personalize": boolean }', response: '{ "success": true, "successful": number, "failed": number }' },
    { endpoint: '/api/email/status', method: 'GET', description: 'Get email service status (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "configured": boolean, "senderAddress": string }' },
    { endpoint: '/api/email/test', method: 'POST', description: 'Send a test email to specified or current user (admin only)', request: '{ "testEmail": "string" }', response: '{ "success": true, "message": "Test email sent to ..." }' },
    { endpoint: '/api/hcaps', method: 'GET', description: 'Get all hcaps', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "hcaps": [...] }' },
    { endpoint: '/api/hcaps/:id', method: 'GET', description: 'Get single hcap', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "hcap": {...} }' },
    { endpoint: '/api/hcaps/:id', method: 'PUT', description: 'Update hcap (admin only)', request: '{ hcap fields..., "author": {...} }', response: '{ "success": true, "hcap": {...} }' },
    { endpoint: '/api/hcaps/:id', method: 'DELETE', description: 'Delete hcap (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "message": "HCap deleted" }' },
    { endpoint: '/api/hcaps/member/:memberId', method: 'GET', description: 'Get hcaps by member', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "hcaps": [...] }' },
    { endpoint: '/api/hcaps/match/:matchId', method: 'GET', description: 'Get hcaps by match', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "hcaps": [...] }' },
    { endpoint: '/api/hcaps/scorecard/:scorecardId', method: 'GET', description: 'Get hcaps by scorecard', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "hcaps": [...] }' },
    { endpoint: '/api/matches', method: 'GET', description: 'Get all matches', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "matches": [...] }' },
    { endpoint: '/api/matches/:id', method: 'GET', description: 'Get single match by ID', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "match": {...} }' },
    { endpoint: '/api/matches/:id', method: 'PUT', description: 'Update match (admin only)', request: '{ match fields..., "author": {...} }', response: '{ "success": true, "match": {...} }' },
    { endpoint: '/api/matches/:id', method: 'DELETE', description: 'Delete match (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "message": "Match deleted" }' },
    { endpoint: '/api/matches/:id/scorecard', method: 'PATCH', description: 'Update match scorecard (admin only)', request: '{ "scorecardId": "string", "author": {...} }', response: '{ "success": true, "match": {...} }' },
    { endpoint: '/api/matches/:id/status', method: 'PATCH', description: 'Update match status (admin only)', request: '{ "status": "open|completed", "author": {...} }', response: '{ "success": true, "match": {...} }' },
    { endpoint: '/api/matches/status/:status', method: 'GET', description: 'Get matches filtered by status', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "matches": [...] }' },
    { endpoint: '/api/matches/user/:userId', method: 'GET', description: 'Get matches for a specific user', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "matches": [...] }' },
    { endpoint: '/api/members', method: 'GET', description: 'Get all members (requires auth)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "count": number, "members": [...] }' },
    { endpoint: '/api/members/:id', method: 'GET', description: 'Get single member by ID', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "member": {...} }' },
    { endpoint: '/api/members/assign-random-index-batch', method: 'POST', description: 'Batch assign random USGAIndex (admin only)', request: '{ "author": {...} }', response: '{ "success": true, "modifiedCount": number }' },
    { endpoint: '/api/members/duplicates/remove', method: 'DELETE', description: 'Remove duplicate email addresses (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "removed": number }' },
    { endpoint: '/api/scorecards', method: 'GET', description: 'Get all scorecards', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "count": number, "scorecards": [...] }' },
    { endpoint: '/api/scorecards/:id', method: 'GET', description: 'Get single scorecard by ID', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "scorecard": {...} }' },
    { endpoint: '/api/scorecards/:id', method: 'PUT', description: 'Update scorecard (admin only)', request: '{ scorecard fields..., "author": {...} }', response: '{ "success": true, "scorecard": {...} }' },
    { endpoint: '/api/scorecards/:id', method: 'DELETE', description: 'Delete scorecard (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "message": "Scorecard deleted" }' },
    { endpoint: '/api/scorecards', method: 'POST', description: 'Create new scorecard (admin only)', request: '{ scorecard fields..., "author": {...} }', response: '{ "success": true, "scorecard": {...} }' },
    { endpoint: '/api/scores', method: 'GET', description: 'Get all scores', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "count": number, "scores": [...] }' },
    { endpoint: '/api/scores/:id', method: 'GET', description: 'Get single score by ID', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "score": {...} }' },
    { endpoint: '/api/scores/:id', method: 'PUT', description: 'Update score (admin only)', request: '{ score fields..., "author": {...} }', response: '{ "success": true, "score": {...} }' },
    { endpoint: '/api/scores/:id', method: 'DELETE', description: 'Delete score (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "message": "Score deleted" }' },
    { endpoint: '/api/scores/match/:matchId', method: 'DELETE', description: 'Delete all scores for a match (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "deletedCount": number }' },
    { endpoint: '/api/scores/match/:matchId', method: 'GET', description: 'Get all scores for a specific match', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "count": number, "scores": [...] }' },
    { endpoint: '/api/scores/member/:memberId', method: 'GET', description: 'Get all scores for a specific member', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "count": number, "scores": [...] }' },
    { endpoint: '/api/scores/scorecard/:scorecardId', method: 'GET', description: 'Get all scores for a specific scorecard', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "count": number, "scores": [...] }' },
    { endpoint: '/api/users', method: 'GET', description: 'Get all users (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "count": number, "users": [...] }' },
    { endpoint: '/api/users/:id', method: 'GET', description: 'Get user by id (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "user": {...} }' },
    { endpoint: '/api/users/:id', method: 'DELETE', description: 'Delete user by id (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "message": "User deleted" }' },
    { endpoint: '/api/users/:id/league', method: 'PATCH', description: 'Update user default league (admin only)', request: '{ "defaultLeague": "string" }', response: '{ "success": true, "user": {...} }' },
    { endpoint: '/api/orphans/cleanup', method: 'POST', description: 'Clean up orphaned records (admin only)', request: '{ "confirm": true }', response: '{ "success": true, "deletedCount": number, "message": "..." }' },
    { endpoint: '/api/orphans/find', method: 'GET', description: 'Find orphaned scores (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "orphans": [...] }' },
    { endpoint: '/api/orphans/report', method: 'GET', description: 'Get orphaned records report (admin only)', request: 'Headers: { "Authorization": "Bearer <token>" }', response: '{ "success": true, "orphanScores": [...], "count": number }' }
    ];
}