The current file is a markdown document that provides instructions for Copilot. Below are the instructions that should be included in this file.
# GitHub Copilot Instructions for Rochester Golf Project
## Overview
This document provides instructions for GitHub Copilot to assist in generating code and documentation for the Rochester Golf project. The project consists of a frontend built with Angular and a backend using Node.js, Express, and Mongoose. The key features include managing members, matches, and scorecards.
## Project Structure
- **Frontend**: Located in the `frontend/` directory, built with Angular.
- **Backend**: Located in the `backend/` directory, built with Node.js, Express, and Mongoose.
When recommending code snippets or documentation, please consider the context of the specific feature being worked on (Members, Matches, Scorecards).
When recommending actions, ensure that the correct folder (frontend or backend) is targeted based on the task.
## Frontend Instructions
The frontend is built with Angular and uses NgRx for state management. Below are the key areas where Copilot can assist:
- **Components**: Located in `frontend/src/app/components/`. Create and manage UI components for Members, Matches, and Scorecards.
- **Services**: Located in `frontend/src/app/services/`. Implement services to interact with the backend API.  Services should include methods for fetching, creating, updating, and deleting data. They should adopt the name of the model they are servicing and include Service (e.g., MemberService, MatchService).
Every service method that creates or updates a record should accept a userId parameter to log the user performing the action.
- **Models**: Located in `frontend/src/app/models/`. Define TypeScript interfaces or classes for data models.
- **NgRx Store**: Located in `frontend/src/app/store/`. Set up actions, reducers, selectors, and effects for state management.
When generating code for the frontend:
- Follow Angular best practices and coding conventions.
- Ensure components are modular and reusable.
- Use RxJS observables for asynchronous data handling.
- Maintain consistent styling and theming with Angular Material.
- When documenting frontend features, provide clear explanations of component usage, service methods, and state management strategies.
- When changes are made, ensure that the UI is responsive and accessible.
- Use the existing codebase as a reference for style and structure.
- Ensure that all new code is covered by appropriate unit tests and, where applicable, end-to-end tests.
## Match-Lineup Specific Instructions
The `match-lineup` component is a critical part of the Matches feature. When generating or modifying code related to this component:
- Ensure that the component accepts `members` and `lineUpsArray` as inputs.
- Implement event emitters for actions such as `removeGroup` and `addMembers`.
- Ensure that the component is integrated seamlessly with the parent `match-edit` component.
- Follow best practices for Angular component design, ensuring clarity and maintainability. 
- When documenting the `match-lineup` component, provide clear instructions on its inputs, outputs, and usage within the Matches feature.
### Match-lineup functions
- `removeGroup(event)`: This function should handle the removal of a group from the lineup. Ensure that it correctly updates the state and UI.
- `openMemberSelectionDialog()`: This function should open a dialog for selecting members to add to the lineup. Ensure that it integrates with the member selection component and updates the lineup accordingly.
- `pairing(groupIndex: number, memberIndex: number)`: This function should return a unique identifier for each pairing in the lineup. Various types of pairing will be available. The configuration component will set the type of pairing used.  Fourball pairing will create two-man teams which consist of an A and a B player. The combined handicap of each team should be as close as possible to other teams in the match. If there are an odd number of players, a low handicap player will be on two teams.
- `getHandicap(memberId: string)`: This function should retrieve the USGAIndex for a given member. Ensure that it fetches the correct data from the member model or service.
