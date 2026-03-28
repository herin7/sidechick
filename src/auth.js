const vscode = require('vscode');
const crypto = require('crypto');

const STORAGE_KEY = 'sidechick.lcCredentials';

function deriveKey() {
  const machineId = vscode.env.machineId || 'sidechick-default-key';
  return crypto.createHash('sha256').update(machineId).digest();
}

function encrypt(text) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

  return {
    version: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    content: encrypted.toString('base64')
  };
}

function decrypt(payload) {
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.content, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

async function saveCredentials(context, credentials) {
  const plaintext = JSON.stringify(credentials);
  const encrypted = encrypt(plaintext);
  await context.globalState.update(STORAGE_KEY, encrypted);
}

function loadCredentials(context) {
  const encrypted = context.globalState.get(STORAGE_KEY);
  if (!encrypted) {
    return null;
  }

  try {
    if (
      typeof encrypted !== 'object' ||
      typeof encrypted.iv !== 'string' ||
      typeof encrypted.tag !== 'string' ||
      typeof encrypted.content !== 'string'
    ) {
      return null;
    }

    return JSON.parse(decrypt(encrypted));
  } catch {
    return null;
  }
}

async function clearCredentials(context) {
  await context.globalState.update(STORAGE_KEY, undefined);
}

async function promptAndSaveCredentials(context) {
  const session = await vscode.window.showInputBox({
    title: 'Sidechick - LeetCode Session Cookie',
    prompt: 'Paste the value of your LEETCODE_SESSION cookie from leetcode.com',
    password: true,
    ignoreFocusOut: true,
    placeHolder: 'e.g. eyJ0eXAiOiJKV1Qi...'
  });

  if (!session) {
    return null;
  }

  const csrfToken = await vscode.window.showInputBox({
    title: 'Sidechick - LeetCode CSRF Token',
    prompt: 'Paste the value of your csrftoken cookie from leetcode.com',
    password: true,
    ignoreFocusOut: true,
    placeHolder: 'e.g. abc123xyz...'
  });

  if (!csrfToken) {
    return null;
  }

  const creds = {
    session: session.trim(),
    csrfToken: csrfToken.trim()
  };

  await saveCredentials(context, creds);
  vscode.window.showInformationMessage('Sidechick: LeetCode credentials saved.');
  return creds;
}

module.exports = {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  promptAndSaveCredentials
};
