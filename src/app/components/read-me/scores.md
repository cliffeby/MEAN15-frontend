# Scores Feature Documentation

## Overview
The Scores feature manages individual score entries for matches and scorecards. It enables creating, listing, editing, and deleting score records and provides endpoints and UI for viewing scores by match, member, and scorecard.

---

## Frontend (Angular)

### Location
- Components: `src/app/components/score-list/`, `score-form/`, `score-edit/` (score entry UIs)
- Service: `src/app/services/scoreService.ts`
- Model: `src/app/models/score.ts`
- Routes: `/scores`, `/scores/add`, `/scores/edit/:id`

### Features
- List, view, add, edit, and delete individual scores
- Filter and search scores by match, member, and scorecard
- Bulk operations for match-related score cleanup (admin)
- Integration with Match and Scorecard features for context-aware score entry

### UI Notes
- Uses Angular Material tables and forms for input and display
- Validation on the frontend ensures required fields are present (member, scorecard, hole scores)
- Score entry can be invoked from a Match context to pre-fill match/scorecard fields

---

## Backend (Node.js / Express / Mongoose)

### Location
- Model: `backend/models/Score.js`
- Controller: `backend/controllers/scoreController.js`
- Routes: `backend/routes/scoreRoutes.js`

### API Endpoints
- `GET /api/scores` — List all scores (supports query params for filtering)
- `GET /api/scores/:id` — Get a single score by ID
- `POST /api/scores` — Create a new score (requires auth)
- `PUT /api/scores/:id` — Update an existing score (requires auth)
- `DELETE /api/scores/:id` — Delete a score (admin or authorized user)
- `GET /api/scores/match/:matchId` — Get all scores for a match
- `GET /api/scores/member/:memberId` — Get all scores for a member
- `GET /api/scores/scorecard/:scorecardId` — Get all scores for a scorecard
- `DELETE /api/scores/match/:matchId` — Delete all scores for a match (admin only)

### Data Model (high level)
- Typical fields: `memberId`, `matchId`, `scorecardId`, `holeScores` (array), `total`, `par`, `date`, `author`, `createdAt`, `updatedAt`
- Validation: ensure `memberId` and `scorecardId` point to existing records; hole scores array length matches scorecard holes

---

## Usage
- Use the sidebar -> **Scores** to view score list and add new scores
- From a Match page, use "Enter Scores" actions to record match results quickly
- Admins can run cleanup operations for orphaned or duplicate scores via the Orphans tools

---

## Notes & Best Practices
- Prefer creating scores within a match context to ensure correct `matchId` and `scorecardId` linkage
- For large imports or backfills, use backend scripts with batching and rate limiting to avoid hitting DB or API limits
- Validate score totals on both frontend and backend to avoid inconsistent state

---

For implementation details, inspect `backend/controllers/scoreController.js`, `backend/models/Score.js`, and `frontend/src/app/services/scoreService.ts`.
