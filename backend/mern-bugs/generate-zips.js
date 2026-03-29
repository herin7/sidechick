const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const problems = [
  {
    name: 'problem-1-cart-total',
    title: 'Fix Cart Total',
    slug: 'fix-cart-total',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
app.use(express.json());
const cart = { items: [{ id: 1, price: 10, qty: 2 }, { id: 2, price: 5, qty: 1 }] };
app.get('/cart/total', (req, res) => {
  const total = cart.items.reduce((acc, item) => acc + item.price, 0); // BUG: missing qty
  res.json({ total });
});
module.exports = app;`,
      'src/server.js': `const app = require('./index'); app.listen(3001);`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('calculates correct total with quantities', async () => {
  const res = await request(app).get('/cart/total');
  expect(res.body.total).toBe(25);
});`,
      'package.json': JSON.stringify({
        name: 'problem-1',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': '# Fix Cart Total\nExpected total: 25. Actual bug is ignoring quantities.',
      '.sidechick.json': JSON.stringify({ name: 'Fix Cart Total', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-2-user-auth',
    title: 'Broken Auth Flow',
    slug: 'broken-auth',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
app.use(express.json());
app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === 'admin' && pass === '123') {
    res.status(201).json({ token: 'abc' }); // BUG: Wrong status code, should be 200
  } else {
    res.status(401).send('Unauthorized');
  }
});
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('returns 200 on success', async () => {
  const res = await request(app).post('/login').send({ user: 'admin', pass: '123' });
  expect(res.status).toBe(200);
});`,
      'package.json': JSON.stringify({
        name: 'problem-2',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Fix status code from 201 to 200.',
      '.sidechick.json': JSON.stringify({ name: 'Broken Auth Flow', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-3-async-bug',
    title: 'Missing Await',
    slug: 'missing-await',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
const db = { getUsers: () => Promise.resolve([{ id: 1, name: 'John' }]) };
app.get('/users', async (req, res) => {
  const users = db.getUsers(); // BUG: missing await
  res.json(users);
});
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('returns list of users', async () => {
  const res = await request(app).get('/users');
  expect(Array.isArray(res.body)).toBe(true);
});`,
      'package.json': JSON.stringify({
        name: 'problem-3',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Fix missing await in /users route.',
      '.sidechick.json': JSON.stringify({ name: 'Missing Await', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-4-off-by-one',
    title: 'Top Scorers Bug',
    slug: 'top-scorers',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
const scores = [100, 90, 80, 70, 60];
app.get('/top3', (req, res) => {
  res.json(scores.slice(0, 2)); // BUG: should be 3
});
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('returns top 3 scores', async () => {
  const res = await request(app).get('/top3');
  expect(res.body.length).toBe(3);
});`,
      'package.json': JSON.stringify({
        name: 'problem-4',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Returns top 3 scores.',
      '.sidechick.json': JSON.stringify({ name: 'Top Scorers Bug', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-5-middleware-order',
    title: 'Auth Bypass',
    slug: 'auth-bypass',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
const auth = (req, res, next) => {
  if (req.headers.auth === 'secret') next();
  else res.status(403).send('Forbidden');
};
app.get('/data', (req, res) => res.json({ msg: 'Success' })); // BUG: Route defined before middleware
app.use(auth);
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('denies access without header', async () => {
  const res = await request(app).get('/data');
  expect(res.status).toBe(403);
});`,
      'package.json': JSON.stringify({
        name: 'problem-5',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Ensure /data is protected by auth middleware.',
      '.sidechick.json': JSON.stringify({ name: 'Auth Bypass', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-6-validation-off',
    title: 'Validator Bug',
    slug: 'validator-bug',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
app.use(express.json());
app.post('/register', (req, res) => {
  const { email } = req.body;
  if (email && email.includes('@')) { // BUG: Too simple validation
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'Invalid' });
  }
});
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('rejects empty email', async () => {
  const res = await request(app).post('/register').send({ email: '' });
  expect(res.status).toBe(400);
});
test('rejects email without domain', async () => {
  const res = await request(app).post('/register').send({ email: 'test@' });
  expect(res.status).toBe(400);
});`,
      'package.json': JSON.stringify({
        name: 'problem-6',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Improve email validation.',
      '.sidechick.json': JSON.stringify({ name: 'Validator Bug', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-7-profile-update',
    title: 'Profile Patch Bug',
    slug: 'profile-patch',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
app.use(express.json());
let user = { id: 1, name: 'Alice', bio: 'Hello' };
app.patch('/profile', (req, res) => {
  user = { ...req.body }; // BUG: Replaces entire object, losing ID
  res.json(user);
});
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('preserves user ID on patch', async () => {
  const res = await request(app).patch('/profile').send({ name: 'Bob' });
  expect(res.body.id).toBe(1);
});`,
      'package.json': JSON.stringify({
        name: 'problem-7',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Fix PATCH behavior to merge instead of replace.',
      '.sidechick.json': JSON.stringify({ name: 'Profile Patch Bug', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-8-json-header',
    title: 'Header Misstep',
    slug: 'header-misstep',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
app.get('/status', (req, res) => {
  res.send('{"status": "ok"}'); // BUG: Sending string without JSON content-type
});
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('returns json content type', async () => {
  const res = await request(app).get('/status');
  expect(res.headers['content-type']).toMatch(/json/);
});`,
      'package.json': JSON.stringify({
        name: 'problem-8',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Return proper JSON header.',
      '.sidechick.json': JSON.stringify({ name: 'Header Misstep', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-9-delete-status',
    title: 'Delete Logic',
    slug: 'delete-logic',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
app.delete('/item/:id', (req, res) => {
  if (req.params.id === '1') {
    res.status(204); // BUG: Missing .send() or .end() to finish response
  } else {
    res.status(404).end();
  }
});
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('finishes response on delete', async () => {
  const res = await request(app).delete('/item/1');
  expect(res.status).toBe(204);
});`,
      'package.json': JSON.stringify({
        name: 'problem-9',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Ensure 204 response is sent.',
      '.sidechick.json': JSON.stringify({ name: 'Delete Logic', entry: 'src/index.js' })
    }
  },
  {
    name: 'problem-10-nested-json',
    title: 'Structure Error',
    slug: 'structure-error',
    files: {
      'src/index.js': `const express = require('express');
const app = express();
app.get('/api/info', (req, res) => {
  res.json({ name: 'app', version: '1.0' }); // BUG: expected nested metadata
});
module.exports = app;`,
      'tests/app.test.js': `const request = require('supertest');
const app = require('../src/index');
test('returns data inside metadata key', async () => {
  const res = await request(app).get('/api/info');
  expect(res.body.metadata.name).toBe('app');
});`,
      'package.json': JSON.stringify({
        name: 'problem-10',
        dependencies: { express: '^4.18.2' },
        devDependencies: { jest: '^29.0.0', supertest: '^6.0.0' },
        scripts: { test: 'jest' }
      }, null, 2),
      'README.md': 'Nest response under "metadata" key.',
      '.sidechick.json': JSON.stringify({ name: 'Structure Error', entry: 'src/index.js' })
    }
  }
];

problems.forEach(p => {
  const zip = new AdmZip();
  Object.keys(p.files).forEach(filePath => {
    zip.addFile(filePath, Buffer.from(p.files[filePath], "utf8"));
  });
  const zipPath = path.join(__dirname, 'zips', `${p.slug}.zip`);
  zip.writeZip(zipPath);
  console.log(`Zipped ${p.name} -> ${zipPath}`);
});

console.log('--- ALL ZIPS GENERATED ---');
