#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function requireArg(args, key) {
  const value = String(args[key] || '').trim();
  if (!value) {
    throw new Error(`Missing required argument --${key}`);
  }

  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(
    args.url || process.env.SIDECHICK_ADMIN_URL || 'http://127.0.0.1:3001'
  ).replace(/\/+$/, '');
  const token = String(args.token || process.env.ADMIN_TOKEN || '').trim();

  if (!token) {
    throw new Error('Missing admin token. Pass --token or set ADMIN_TOKEN.');
  }

  const filePath = path.resolve(requireArg(args, 'file'));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archive not found: ${filePath}`);
  }

  const form = new FormData();
  form.append('title', requireArg(args, 'title'));
  form.append('slug', requireArg(args, 'slug'));
  form.append('difficulty', String(args.difficulty || 'medium').trim().toLowerCase());
  form.append('description', String(args.description || '').trim());
  form.append(
    'isActive',
    String(args.active || 'true').trim().toLowerCase() === 'false' ? 'false' : 'true'
  );
  form.append(
    'archive',
    new Blob([fs.readFileSync(filePath)], { type: 'application/zip' }),
    path.basename(filePath)
  );

  const response = await fetch(`${baseUrl}/api/admin/problems`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  const data = await response.json().catch((err) => ({ message: `Failed to parse JSON response: ${err.message}`, text: response.text() }));
  if (!response.ok) {
    console.error('--- UPLOAD FAILED ---');
    console.error('Status:', response.status);
    console.error('Response Body:', JSON.stringify(data, null, 2));
    throw new Error(data.error || `Upload failed with status ${response.status}`);
  }

  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

