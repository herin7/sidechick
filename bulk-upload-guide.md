# SideChick Bulk Problem Upload Guide

This guide explains how to generate, package, and upload MERN bug-fix challenges to the SideChick production backend in bulk.

---

## 1. Prerequisites

Ensure you have the following installed and configured:
- **Node.js** (v18+)
- **npm install adm-zip** (Required for the generation script)
- **Admin Token**: `THISISONLTFORHERINSTAYAWAY`
- **Backend URL**: `https://sidechick.onrender.com`

---

## 2. Bulk Upload Architecture

The bulk upload process consists of three parts located in `backend/mern-bugs/`:
1. **`generate-zips.js`**: Programmatically creates 10 independent MERN projects and zips them.
2. **`zips/`**: The directory where the generated `.zip` files are stored.
3. **`upload-all.js`**: An orchestrator script that calls the core `upload-problem.js` script for each zip.

---

## 3. Commands Needed

To run the full pipeline, navigate to the `backend/mern-bugs` directory and run:

### Step A: Generate the Problems
This script creates 10 unique problems with intentional bugs, tests, and metadata.
```powershell
node generate-zips.js
```

### Step B: Upload to Production
This script reads the zips and pushes them to your Render backend via the Admin API.
```powershell
node upload-all.js
```

*Note: If you are using PowerShell and want to run it in one go:*
```powershell
node generate-zips.js; node upload-all.js
```

---

## 4. How to Test & Verify

After running the upload script, follow these steps to ensure everything is working:

### A. Check CLI Output
A successful upload will return a JSON response for each problem:
```json
{
  "success": true,
  "problem": {
    "id": "...",
    "title": "Fix Cart Total",
    "slug": "fix-cart-total"
  }
}
```

### B. Verify via Leaderboard
1. Go to your [SideChick Leaderboard UI](https://sidechick-leaderboard.vercel.app).
2. Check if the newly uploaded problem slugs appear in the active challenge list.

### C. Test in VS Code (The Real Test)
1. Open your **SideChick** extension.
2. Trigger the manual challenge picker or use the Bulk Insert trigger.
3. Select **"MERN Challenge"**.
4. If the backend is updated, it will fetch one of your newly uploaded problems from Render.
5. Run `npm test` inside the spawned Dev Workspace—**it should fail initially**.
6. Fix the bug as described in the problem's `README.md`.
7. Run `npm test` again—**it should now pass**.
8. Click **"Verify Challenge"** in the SideChick panel; it should confirm the solve and report success.

---

## 5. Troubleshooting

- **"fetch failed"**: Ensure `BASE_URL` in `upload-all.js` is correct and Render isn't "sleeping" (the first request might take 30s as the free tier spins up).
- **"Unauthorized"**: Verify that the `ADMIN_TOKEN` matches the one set in your Render Environment Variables.
- **Missing `adm-zip`**: Run `npm install adm-zip` in the `backend/mern-bugs` folder.
