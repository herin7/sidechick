# SideChick Hosting & Deployment Guide

This guide details the complete deployment strategy for SideChick, structured across its three core components: the Backend, the Web UI, and the Extension.

As a general rule:
- **All Backends** are hosted on **Render** (Free/Starter Node.js servers).
- **All Frontends** are hosted on **Vercel** (Optimized for React/Vite).
- **The VS Code Extension** is published to the **Microsoft Extension Marketplace**.

---

## 1. Backend Deployment (Render)

The SideChick backend is an Express/PostgreSQL API located in the `/backend` folder. It serves MERN bug payloads, tracks leaderboards, and validates authentication.

### Steps to Deploy:
1. Create a [Render](https://render.com) account and click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Root Directory**: `backend` (if repo is a monorepo, specify `backend/` here).
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add the following **Environment Variables**:
   - `DATABASE_URL`: Your PostgreSQL connection string (e.g., your NeonDB URL).
   - `PORT`: `3000` (Render binds to this dynamically).
5. Click **Deploy**.
6. When your service is live, copy the assigned URL (e.g., `https://sidechick.onrender.com/`). You will use this in both the Extension Settings and the Web UI.

## 2. Frontend Deployment (Vercel)

The `/leaderboard-ui` folder hosts the React/Vite dashboard.

### Steps to Deploy:
1. Create a [Vercel](https://vercel.com) account and click **Add New...** -> **Project**.
2. Import your Git repository.
3. Configure the project:
   - **Root Directory**: Select `leaderboard-ui` or type `leaderboard-ui`.
   - **Framework Preset**: `Vite` (Vercel will auto-detect).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variables**:
   - `API_BASE_URL`: The URL of your Render backend (e.g., `https://sidechick.onrender.com`).
5. Click **Deploy**. Vercel will process it and assign a `.vercel.app` domain.

---

## 3. VS Code Extension Deployment

The extension relies on your live Render backend and communicates directly with LeetCode's GraphQL API. 

### Step 1: Prepare the Webview
The VS Code Extension uses a standalone Vite project inside `/webview-ui` for its in-editor UI. You **must** compile it before packaging the extension:
```bash
npm run build:webview
```
*(This triggers `vite build` to inject the frontend code into the `dist/` folder for VS Code to read).*

### Step 2: Configure Defaults
Inside your root `package.json`, ensure your `sidechick.backendBaseUrl` property points to your live Render endpoint so players don't need to manually configure it:
```json
"default": "https://sidechick.onrender.com/"
```

### Step 3: Package & Test
Install the official Visual Studio Code publishing tool:
```bash
npm install -g @vscode/vsce
```
Package your extension locally:
```bash
vsce package
```
*This generates a `sidechick-0.1.0.vsix` file which you can share or test offline.*

### Step 4: Publish to the Marketplace
1. Obtain an Azure DevOps **Personal Access Token (PAT)**.
2. Sign up on the [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage). Your publisher ID must match the `publisher` tag in `package.json` (`HerinSoni`).
3. Log in via CLI:
```bash
vsce login HerinSoni
```
4. Push to Microsoft Marketplace:
```bash
vsce publish
```
