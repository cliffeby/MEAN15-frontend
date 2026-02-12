## Plan: Azure Static Web App Deployment via GitHub Actions

Deploy your Angular frontend to Azure Static Web Apps using GitHub Actions for automated CI/CD.

### Steps
1. **Push Angular Project to GitHub**
   - Ensure your frontend code is in a GitHub repository.

2. **Create Azure Static Web App (Portal)**
   - In Azure Portal, create a Static Web App.
   - Select your GitHub repo and branch for deployment.

3. **Azure Auto-Creates GitHub Actions Workflow**
   - Azure will add a `.github/workflows/azure-static-web-apps.yml` file to your repo.
   - This workflow builds and deploys your Angular app on every push.

4. **Configure Build Settings**
   - In the workflow file, set:
     - `app_location`: path to your Angular app (e.g., `/frontend` or `/`)
     - `output_location`: path to build output (e.g., `dist/<project-name>`)

5. **Set Environment Variables in Azure**
   - In Azure Portal, Static Web App → Configuration, add variables like `API_BASE_URL`.

6. **Push Changes to GitHub**
   - Any push to the selected branch triggers the workflow and deploys your app.

7. **Verify Deployment**
   - Azure provides a public URL for your Static Web App.
   - Test frontend and backend connectivity.

### Further Considerations
1. Edit the workflow file for custom build steps or environment variables.
2. Use protected branches for production deployments.
3. For secrets, use Azure Portal → Configuration, not GitHub Actions secrets.
