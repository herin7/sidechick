# Dev Setup

1. Install root deps:
   `npm install`
2. Install webview deps:
   `cd webview-ui && npm install`
3. Install backend deps:
   `cd backend && npm install`
4. Start backend:
   `cd backend && set ADMIN_TOKEN=your-secret-token && npm start`
5. Build webview:
   `npm run build:webview`
6. In VS Code settings, set:
   `sidechick.backendBaseUrl`
   `sidechick.userHandle` (optional)
7. To upload remote dev problems later:
   `cd backend && npm run upload:problem -- --file "C:\path\problem.zip" --title "Problem Title" --slug "problem-slug"`
