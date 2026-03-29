# SideChick

SideChick is a VS Code extension that interrupts AI-assisted coding with a challenge gate. Before Copilot, Cursor, or Claude Code can keep helping, the developer has to clear a DSA problem or fix a broken MERN app.

## What It Does

- Intercepts AI activity inside VS Code
- Opens a dark React webview lock screen
- Lets users sign in with GitHub or continue anonymously
- Tracks streaks and solves in Neon PostgreSQL when authenticated
- Keeps anonymous mode fully local with no leaderboard sync
- Powers a separate leaderboard UI at `http://localhost:5173`

## Architecture

### Extension

- `extension.js` coordinates onboarding, auth, AI interception, challenge launch, and score sync
- `src/auth.js` stores GitHub and backend credentials in VS Code SecretStorage
- `src/backendClient.js` proxies all backend traffic through the extension host
- `src/challengeService.js` chooses DSA or dev challenges based on `sidechick.mode`
- `src/providers/lc.js` runs local JavaScript DSA evaluation
- `src/providers/mern.js` opens a broken workspace and verifies it with `npm test`

### Backend

- `backend/src/server.js` runs the Express API
- `backend/src/db/postgres.js` is the Postgres adapter using `pg`
- `backend/db/schema.sql` initializes Neon PostgreSQL tables
- Authenticated score and leaderboard APIs live under `backend/src/routes`

### Webview

- `webview-ui` is the React + Vite UI rendered inside the VS Code webview
- The webview is locked behind a strict CSP and cannot call external APIs directly
- Monaco runs locally inside the webview bundle

## Modes

### DSA

- Uses local SideChick problem definitions or a remote problem from the backend
- Solves run locally in the extension host
- Passing sends `accepted` to the backend when the user is signed in

### Dev

- Copies a broken MERN template into a temp workspace
- Opens that workspace in a new VS Code window
- Verifies the fix with `npm test`
- Passing sends `passed` to the backend when the user is signed in

## Auth Model

- On first activation, SideChick offers:
  - `Log in with GitHub`
  - `Continue Anonymously`
- GitHub sign-in uses `vscode.authentication.getSession('github', ['read:user'])`
- The backend returns a JWT used for score sync and user stats
- Anonymous users still get blocked by SideChick, but nothing is synced to Neon

## Backend APIs

- `POST /api/auth/login`
- `POST /api/user/score`
- `GET /api/user/stats`
- `GET /api/leaderboard/global`
- `GET /api/leaderboard/teams`
- `GET /api/problems/:type/random`

## Configuration

### Extension settings

- `sidechick.backendBaseUrl`
- `sidechick.mode` with values `dsa`, `dev`, or `random`

### Backend environment

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`

## Run It

### 1. Start the backend

```powershell
cd backend
$env:DATABASE_URL="your_neon_connection_string"
$env:JWT_SECRET="your_jwt_secret"
npm run db:init
npm run dev
```

### 2. Build or rebuild the webview bundle

```powershell
npm run build:webview
```

### 3. Run the leaderboard app

```powershell
cd leaderboard-ui
npm run dev
```

### 4. Launch the extension

- Open this repo in VS Code
- Press `F5` to start the extension development host
- Trigger `Sidechick: Start Challenge` or let an AI interceptor fire

## More Detail

- Scoring and leaderboard rules: `flow.md`
- Backend schema: `backend/db/schema.sql`
