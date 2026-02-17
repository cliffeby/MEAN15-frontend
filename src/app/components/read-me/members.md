# Members Feature Documentation

## Overview
The Members feature allows users to view, add, edit, and manage members in the application. It is available in both the frontend (Angular) and backend (Node.js/Express/Mongoose).

---

## Frontend (Angular)

### Location
- Components: `src/app/components/member-list/`, `member-form/`, `member-edit/`
- Service: `src/app/services/memberService.ts`
- Model: `src/app/models/member.ts`
- Routes: `/members`, `/members/edit/:id`, `/members/new`

### Features
- List all members with details (name, email, league, etc.)
- Add new members via a form
- Edit existing members
- Delete members
- Search/filter members
- Member selection dialog for other features (e.g., match setup)

### Usage
- Access via sidebar: Click "Members" to view the list
- Add/Edit: Use the buttons in the member list or details page
- Data is fetched from the backend via `MemberService`

---

## Backend (Node.js/Express/Mongoose)

### Location
- Model: `backend/models/Member.js`
- Controller: `backend/controllers/memberController.js`
- Routes: `backend/routes/memberRoutes.js`

### API Endpoints
- `GET /api/members` — List all members
- `GET /api/members/:id` — Get member by ID
- `POST /api/members` — Add new member
- `PUT /api/members/:id` — Update member
- `DELETE /api/members/:id` — Delete member

### Data Model
- Fields: name, email, league, handicap, status, etc.
- Validation and business logic handled in controller/model

---

## How to Use
- Use the sidebar to navigate to "Members"
- All member management actions are available from the Members page
- Changes are reflected in both frontend and backend

---

## Additional Notes
- Member data is used in matches, scorecards, and other features
- Permissions may restrict access to member management
- For technical details, see the respective service, model, and controller files

---

For further help, contact the project maintainer or see the full API documentation.
