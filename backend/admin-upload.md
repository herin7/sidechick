# Admin Upload

1. Start the backend with an admin token:
   `set ADMIN_TOKEN=your-secret-token`
   `npm start`
2. Zip a dev challenge folder that contains `.sidechick.json`.
3. Upload it:
   `npm run upload:problem -- --file "C:\path\problem.zip" --title "Cart Summary Bug" --slug "cart-summary-bug" --difficulty medium --description "Fix the broken cart totals"`
4. The extension will fetch remote dev problems from:
   `GET /api/problems/dev/random`

Notes:
- Files are stored in `backend/uploads/problems`
- Problem metadata is stored in SQLite
- If the backend has no remote dev problems, the extension falls back to local bundled problems
