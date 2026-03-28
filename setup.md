# Sidechick Deployment Setup

This guide covers the two production pieces of Sidechick:

- the backend API on Render
- the VS Code extension on the Visual Studio Marketplace

It also includes the admin-only dev-problem upload flow, because your extension now fetches remote Dev challenges from the backend.

## 1. What Gets Deployed

### Backend

The backend lives in [backend](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\backend) and is responsible for:

- score reporting
- serving remote Dev problems
- storing uploaded Dev problem zip files
- storing metadata in SQLite

### Extension

The extension lives at the repo root and is published to the VS Code Marketplace as a VSIX/package.

The extension talks to the backend through the `sidechick.backendBaseUrl` setting.

## 2. Backend Deployment on Render

Use a Render Web Service for the backend.

### 2.1 Create the service

In Render:

1. Click `New +`
2. Choose `Web Service`
3. Connect your GitHub repo
4. Set `Root Directory` to `backend`
5. Use these commands:
   - Build Command: `npm install`
   - Start Command: `npm start`

### 2.2 Add a persistent disk

This is required.

Render's filesystem is ephemeral by default, so without a persistent disk your uploaded problem zips and SQLite database will disappear after redeploys or restarts.

Add a disk in the Render service settings:

- Mount Path: `/var/data`
- Size: `1 GB` is enough to start

### 2.3 Set environment variables

Add these in Render:

- `ADMIN_TOKEN`
  Use a long secret string. This protects the admin upload route.
- `DB_PATH`
  Set to `/var/data/sidechick.db`
- `UPLOADS_DIR`
  Set to `/var/data/uploads/problems`

Optional:

- `PORT`
  Usually not needed on Render because Render already provides it.

### 2.4 Health check

Set the health check path to:

`/api/health`

### 2.5 Deploy and copy the backend URL

After deploy, Render will give you a public URL like:

`https://your-service-name.onrender.com`

You will use this URL:

- for the extension backend base URL
- for admin problem uploads

## 3. Uploading Remote Dev Problems

Only you need this flow.

### 3.1 Prepare the problem zip

Zip a Dev problem folder.

The archive should contain the actual challenge project, including:

- `.sidechick.json`
- `package.json`
- source files
- tests

Best practice:

- zip the project folder contents cleanly
- keep `.sidechick.json` at the project root inside the zip

### 3.2 Upload from your machine

From [backend](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\backend):

```powershell
$env:ADMIN_TOKEN="your-secret-token"
$env:SIDECHICK_ADMIN_URL="https://your-service-name.onrender.com"
npm run upload:problem -- --file "C:\path\problem.zip" --title "Cart Summary Bug" --slug "cart-summary-bug" --difficulty medium --description "Fix the broken cart totals"
```

What this does:

- uploads the zip to the backend
- stores the file under the Render disk
- saves metadata in SQLite
- makes the problem available to the extension

### 3.3 Verify the remote problem API

You can open these in the browser:

- `https://your-service-name.onrender.com/api/health`
- `https://your-service-name.onrender.com/api/problems/dev`
- `https://your-service-name.onrender.com/api/problems/dev/random`

## 4. Extension Configuration Before Marketplace Publish

Before publishing, update the extension to point to production.

### 4.1 Change the default backend URL

In [package.json](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\package.json), change the default value of:

`sidechick.backendBaseUrl`

from:

`http://127.0.0.1:3001`

to your Render backend URL:

`https://your-service-name.onrender.com`

This is important. If you skip it, installed users will point to localhost and Dev mode remote fetches will fail unless they change settings manually.

### 4.2 Add publisher details

Before Marketplace publish, your extension manifest must include a `publisher` field in [package.json](C:\Users\Admin\Desktop\Development\sidechicks\sidechick\package.json).

Example:

```json
"publisher": "your-publisher-id"
```

### 4.3 Replace the Marketplace icon with PNG

For Marketplace publishing, use a PNG icon of at least `128x128`.

Current repo state:

- the extension uses an `.ico` for local identity

Before publishing, create a PNG version and point `package.json` `icon` to that PNG file.

Example:

```json
"icon": "media/sidechick.png"
```

### 4.4 Recommended manifest extras

These are strongly recommended before publishing:

- `repository`
- `license`
- a polished `README.md`
- `CHANGELOG.md`

## 5. Publish the Extension to the VS Code Marketplace

### 5.1 Install the publishing CLI

```powershell
npm install -g @vscode/vsce
```

### 5.2 Create a Marketplace publisher

You need:

- an Azure DevOps organization
- a Personal Access Token with Marketplace `Manage` scope
- a VS Code Marketplace publisher

### 5.3 Log in with `vsce`

```powershell
vsce login your-publisher-id
```

### 5.4 Package locally first

From the repo root:

```powershell
vsce package
```

This creates a `.vsix` file you can test locally.

### 5.5 Publish

```powershell
vsce publish
```

Or publish and bump version in one step:

```powershell
vsce publish patch
```

### 5.6 Important packaging note

The repo is now configured so `vsce` runs:

`npm run build:webview`

before packaging or publishing.

That keeps your webview bundle fresh automatically.

## 6. Final Release Checklist

Before going live, confirm all of these:

- Render backend is deployed
- persistent disk is attached on Render
- `ADMIN_TOKEN` is set on Render
- `DB_PATH=/var/data/sidechick.db`
- `UPLOADS_DIR=/var/data/uploads/problems`
- at least one remote Dev problem is uploaded
- `sidechick.backendBaseUrl` default points to Render
- `publisher` is added to `package.json`
- extension icon is changed to PNG for Marketplace
- `vsce package` succeeds
- the produced VSIX installs correctly
- `vsce publish` succeeds

## 7. What To Do Next

Do these next, in order:

1. Deploy the backend on Render
2. Attach the persistent disk
3. Set `ADMIN_TOKEN`, `DB_PATH`, and `UPLOADS_DIR`
4. Upload your first real Dev problem zip
5. Change the extension default backend URL to the Render URL
6. Add your Marketplace `publisher`
7. Replace the extension manifest icon with PNG
8. Run `vsce package`
9. Install the VSIX locally and test both `DSA` and `Dev`
10. Publish with `vsce publish`

## Official References

- [Render docs](https://render.com/docs/)
- [Render environment variables](https://render.com/docs/environment-variables)
- [VS Code publishing extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code extension manifest](https://code.visualstudio.com/api/references/extension-manifest)
