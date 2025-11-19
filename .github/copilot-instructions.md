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