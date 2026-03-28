# Sidechick Deployment Setup

This guide covers the two production pieces of Sidechick:

- the backend API on Render
- the VS Code extension on the Visual Studio Marketplace

It also includes the admin-only Dev problem upload flow, because the extension now fetches remote Dev challenges from the backend.

## 1. What Gets Deployed

### Backend

The backend lives in [backend](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\backend) and is responsible for:

- score reporting
- serving remote Dev problems
- storing uploaded Dev problem zip files
- storing metadata in SQLite

### Extension

The extension lives at the repo root and is published to the VS Code Marketplace as a VSIX package.

The extension talks to the backend through the `sidechick.backendBaseUrl` setting.

## 2. Backend Deployment on Render

Use a Render Web Service for the backend.

### 2.1 Create the service

In Render:

1. Click `New +`
2. Choose `Web Service`
3. Connect your GitHub repo
4. Set `Root Directory` to `backend`
5. Use:
   - Build Command: `npm install`
   - Start Command: `npm start`

### 2.2 Production storage on Render

If you want uploaded Dev problems and SQLite data to persist across redeploys and restarts, attach a persistent disk.

Recommended disk setup:

- Mount Path: `/var/data`
- Size: `1 GB` to start

Then set:

- `DB_PATH=/var/data/sidechick.db`
- `UPLOADS_DIR=/var/data/uploads/problems`

### 2.3 Free Render mode

If you do not want to pay for a disk yet, the backend can still run using temporary storage.

Set:

- `DB_PATH=/tmp/sidechick.db`
- `UPLOADS_DIR=/tmp/uploads/problems`

This works for demos and testing, but uploaded Dev problems and SQLite data can disappear after restarts or redeploys.

### 2.4 Required environment variables

Set these in Render:

- `ADMIN_TOKEN`
  Use a long secret string. This protects the admin upload route.
- `DB_PATH`
  Use either `/var/data/sidechick.db` or `/tmp/sidechick.db`
- `UPLOADS_DIR`
  Use either `/var/data/uploads/problems` or `/tmp/uploads/problems`

Optional:

- `PORT`
  Usually not needed on Render because Render already provides it.

### 2.5 Health check

Set the health check path to:

`/api/health`

### 2.6 Backend URL

After deploy, Render gives you a public URL like:

`https://sidechick.onrender.com`

You will use this URL:

- for the extension backend base URL
- for admin problem uploads

## 3. Uploading Remote Dev Problems

Only you need this flow.

### 3.1 Prepare the zip

Zip a Dev problem folder.

The archive should contain the actual challenge project, including:

- `.sidechick.json`
- `package.json`
- source files
- tests

Best practice:

- zip the project root cleanly
- keep `.sidechick.json` at the project root inside the zip

### 3.2 Upload from your machine

From [backend](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\backend):

```powershell
$env:ADMIN_TOKEN="your-secret-token"
$env:SIDECHICK_ADMIN_URL="https://sidechick.onrender.com"
npm run upload:problem -- --file "C:\path\problem.zip" --title "Cart Summary Bug" --slug "cart-summary-bug" --difficulty medium --description "Fix the broken cart totals"
```

### 3.3 Verify the API

Open these in the browser:

- `https://sidechick.onrender.com/api/health`
- `https://sidechick.onrender.com/api/problems/dev`
- `https://sidechick.onrender.com/api/problems/dev/random`

## 4. Extension Configuration Before Marketplace Publish

Before publishing, confirm the extension points to production.

### 4.1 Backend URL default

In [package.json](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\package.json), `sidechick.backendBaseUrl` should point to your production backend URL.

Example:

`https://sidechick.onrender.com`

### 4.2 Publisher

Before Marketplace publish, add your real `publisher` field in [package.json](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\package.json).

### 4.3 Icon

For Marketplace publishing, use a PNG icon of at least `128x128`.

The repo already includes [media/sidechick.png](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\media\sidechick.png).

### 4.4 Recommended manifest extras

Before publishing, it is good to have:

- `repository`
- `license`
- polished `README.md`
- `CHANGELOG.md`

## 5. Publish the Extension

### 5.1 Install `vsce`

```powershell
npm install -g @vscode/vsce
```

### 5.2 Create a Marketplace publisher

You need:

- an Azure DevOps organization
- a Personal Access Token with Marketplace `Manage` scope
- a VS Code Marketplace publisher

### 5.3 Log in

```powershell
vsce login your-publisher-id
```

### 5.4 Package first

From the repo root:

```powershell
vsce package
```

This creates a `.vsix` file you can install locally.

### 5.5 Publish

```powershell
vsce publish
```

Or:

```powershell
vsce publish patch
```

### 5.6 Packaging note

The repo is configured with:

`vscode:prepublish`

so the webview auto-builds before packaging or publishing.

## 6. Final Release Checklist

- Render backend deployed
- `ADMIN_TOKEN` set
- `DB_PATH` set correctly
- `UPLOADS_DIR` set correctly
- at least one remote Dev problem uploaded
- extension backend URL points to production
- `publisher` is real
- PNG Marketplace icon is set
- `vsce package` succeeds
- VSIX installs correctly
- `vsce publish` succeeds

## 7. What To Do Next

1. Deploy backend on Render
2. Choose `persistent disk` or `free /tmp mode`
3. Set env vars
4. Upload your first real Dev problem zip
5. Confirm `sidechick.backendBaseUrl` points to production
6. Package with `vsce package`
7. Test the VSIX locally
8. Publish with `vsce publish`

## References

- [Render docs](https://render.com/docs/)
- [Render environment variables](https://render.com/docs/environment-variables)
- [VS Code publishing extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code extension manifest](https://code.visualstudio.com/api/references/extension-manifest)
