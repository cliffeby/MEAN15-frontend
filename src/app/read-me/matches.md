# Matches Feature Documentation

## Overview
The Matches feature enables users to create, view, edit, and manage golf matches, including player lineups, scorecards, and match status. It is tightly integrated with NgRx for state management in the frontend.

---

## Frontend (Angular)

### Location
- Components: `src/app/components/match-list/`, `match-form/`, `match-edit/`, `match-selection-dialog/`
- Service: `src/app/services/matchService.ts`
- Model: `src/app/models/match.ts`
- Store: `src/app/store/match/` (actions, reducers, selectors, effects)
- Routes: `/matches`, `/matches/edit/:id`, `/matches/new`

### Features
- List all matches with details (name, date, scorecard, status, etc.)
- Create new matches with player lineups and scorecard assignment
- Edit match details and status
- Delete matches
- View match results and scores
- Select matches for other features (e.g., score entry)

### NgRx Store Usage
- **Actions:** Define match-related events (load, create, update, delete)
- **Reducers:** Manage match state (list, selected match, loading, error)
- **Selectors:** Query match state for components (get all matches, get selected match)
- **Effects:** Handle side effects (API calls for matches)
- **Benefits:**
  - Centralized state management for matches
  - Automatic UI updates when match data changes
  - Simplified data flow and debugging
  - Decouples API logic from UI components

### Usage
- Access via sidebar: Click "Matches" to view the list
- Add/Edit: Use the buttons in the match list or details page
- Data is managed via NgRx store and fetched from the backend via `MatchService`

---

## Backend (Node.js/Express/Mongoose)

### Location
- Model: `backend/models/Match.js`
- Controller: `backend/controllers/matchController.js`
- Routes: `backend/routes/matchRoutes.js`

### API Endpoints
- `GET /api/matches` — List all matches
- `GET /api/matches/:id` — Get match by ID
- `POST /api/matches` — Add new match
- `PUT /api/matches/:id` — Update match
- `DELETE /api/matches/:id` — Delete match

### Data Model
- Fields: name, date, scorecardId, lineUps, status, results, etc.
- Validation and business logic handled in controller/model

---

## How to Use
- Use the sidebar to navigate to "Matches"
- All match management actions are available from the Matches page
- Changes are reflected in both frontend and backend

---

## Additional Notes
- Match data is used in score entry, leaderboards, and other features
- NgRx ensures consistent state and UI updates
- For technical details, see the respective service, model, controller, and store files

---

For further help, contact the project maintainer or see the full API documentation.
