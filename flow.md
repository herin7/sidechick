# SideChick Flow

This document explains how the production-style SideChick flow works after the Neon migration.

## Big Picture

1. The VS Code extension activates.
2. On first run, the user chooses GitHub login or anonymous mode.
3. When an AI trigger is detected, SideChick opens the lock webview.
4. The extension chooses a DSA or MERN challenge.
5. The user solves the challenge.
6. If the user is authenticated, the extension syncs the result to the backend.
7. The backend upserts challenge progress in Neon PostgreSQL.
8. Stats and leaderboards are calculated from challenge history.

## Auth Flow

### Logged-in users

1. The extension calls `vscode.authentication.getSession('github', ['read:user'], { createIfNone: true })`.
2. It fetches the GitHub profile from the GitHub API.
3. It sends that profile to `POST /api/auth/login`.
4. The backend upserts the user and returns a JWT.
5. The extension stores:
   - GitHub session data in `context.secrets`
   - backend JWT in `context.secrets`
   - backend user snapshot in `context.secrets`

### Anonymous users

- The extension stores `sidechick.isAnonymous = true` in `context.globalState`
- Challenges still run locally
- No score sync happens
- No streak or leaderboard cloud state is built

## Database Model

SideChick now uses Neon PostgreSQL only.

### `users`

- `id`: GitHub user id
- `handle`: GitHub username
- `team_id`: optional foreign key to `teams`
- `created_at`

### `teams`

- `id`
- `name`
- `created_at`

### `problems`

- `id`
- `type`: `lc`, `cf`, or `mern`
- `title`
- `difficulty`
- `metadata`: JSONB
- plus supporting fields already used by the app such as `slug`, `description`, `archive_path`, `is_active`

### `challenges`

- `user_id`
- `type`
- `problem_id`
- `status`
- `time_secs`
- `created_at`

There is a unique constraint on `(user_id, type, problem_id)`.

That means SideChick keeps the latest state for a given user/problem/type tuple instead of storing every attempt forever.

## Challenge Selection

### DSA mode

- The extension checks `sidechick.mode`
- If mode is `dsa`, it serves a DSA problem
- If mode is `random`, it randomly chooses DSA or dev
- For authenticated users, the extension may ask the backend for a random problem from `GET /api/problems/:type/random`
- If no remote DSA problem is available, it falls back to bundled local DSA problems

### Dev mode

- The extension copies a local broken MERN template into a temp folder
- It opens that temp workspace in a new VS Code window
- Verification is done with `npm test`

## How A Pass Is Evaluated

### DSA

- The webview sends the current JavaScript solution to the extension host
- The extension runs the solution locally with a sandboxed evaluator
- Public tests are used for "Run Samples"
- Public plus hidden tests are used for "Submit"
- If all tests pass, SideChick treats the result as `accepted`

### MERN / dev

- The user fixes the cloned project in a new window
- The webview asks the extension host to verify the project
- The extension runs `npm test` in the temp workspace
- Exit code `0` means the result is `passed`

## Score Sync

Only authenticated users sync results.

The extension calls:

- `POST /api/user/score`

Payload:

- `type`
- `problemId`
- `status`
- `timeSecs`

The JWT is attached in the `Authorization` header.

If sync fails after a successful local pass, the extension still unlocks the session and shows a warning instead of trapping the user.

## What Counts As Solved

A challenge counts as solved if:

- `status = accepted`, or
- `status = passed`

`failed` does not count toward totals or streaks.

## Streak Calculation

The backend calculates streaks from distinct solved calendar days in UTC.

Rules:

1. Find all distinct solve dates for the user where status is `accepted` or `passed`
2. Sort newest to oldest
3. A streak only stays alive if the newest solve date is today or yesterday
4. Count consecutive days going backward

Examples:

- Solved today, yesterday, and the day before: streak `3`
- Solved yesterday but not today: streak `1`
- Last solve was two or more days ago: streak `0`

## Global Leaderboard

Route:

- `GET /api/leaderboard/global`

Returned fields:

- `handle`
- `streak`
- `total_solved`

Ranking:

1. `streak DESC`
2. `total_solved DESC`
3. `handle ASC`

Meaning:

- consistency is the primary signal
- solve volume is the secondary signal

## Team Leaderboard

Route:

- `GET /api/leaderboard/teams`

Returned fields:

- `team_id`
- `name`
- `total_team_solves`
- `avg_streak`

Aggregation:

1. Compute each user's solved count
2. Compute each user's streak
3. Group by team
4. Sum solves into `total_team_solves`
5. Average streaks into `avg_streak`

Ranking:

1. `total_team_solves DESC`
2. `name ASC`

## What The System Rewards Today

Right now SideChick rewards:

- clearing challenges consistently
- solving more unique problems
- building team totals through shared participation

It does not currently reward:

- difficulty more than volume
- DSA more than dev
- speed more than correctness
- partial credit

`time_secs` is stored, but it is metadata today, not a ranking factor.

## Security Model

- The leaderboard UI talks directly to the backend through CORS on `http://localhost:5173`
- The VS Code webview does not call external APIs
- The webview CSP uses `connect-src 'none'`
- All extension-related network access is proxied through the extension host

## Neon Resilience

- Backend queries are wrapped in retry logic for transient Postgres/network failures
- This helps when Neon is cold and waking up
- Routes still return standard JSON errors if a query ultimately fails
