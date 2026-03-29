const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const BASE_URL = 'https://sidechick.onrender.com';
const ADMIN_TOKEN = 'THISISONLTFORHERINSTAYAWAY';

// change this to one zip you already have
const TEST_ZIP = path.join(__dirname, '..', 'mern-bugs', 'zips', 'fix-cart-total.zip');

async function uploadProblem() {
  console.log('--- STEP 1: UPLOAD ---');

  if (!fs.existsSync(TEST_ZIP)) {
    throw new Error('Zip not found');
  }

  const form = new FormData();
  form.append('title', 'Test Problem');
  form.append('slug', `test-${Date.now()}`);
  form.append('difficulty', 'medium');
  form.append('archive', fs.createReadStream(TEST_ZIP));

  const res = await fetch(`${BASE_URL}/api/admin/problems`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: form
  });

  const data = await res.json().catch(() => ({}));

  console.log('UPLOAD RESPONSE:', data);

  if (!res.ok) {
    throw new Error('Upload failed');
  }

  return data.problem?.slug;
}

async function fetchRandomProblem() {
  console.log('\n--- STEP 2: FETCH RANDOM ---');

  const res = await fetch(`${BASE_URL}/api/problems/mern/random`);

  const data = await res.json().catch(() => ({}));

  console.log('FETCH RESPONSE:', data);

  if (!res.ok) {
    throw new Error('Fetch failed');
  }

  if (!data.problem) {
    throw new Error('No problem returned');
  }

  return data.problem;
}

async function main() {
  try {
    const slug = await uploadProblem();

    // wait for DB consistency (optional)
    await new Promise(r => setTimeout(r, 2000));

    const problem = await fetchRandomProblem();

    console.log('\n--- RESULT ---');
    console.log('Upload slug:', slug);
    console.log('Fetched problem:', problem);

    console.log('\n✅ SYSTEM WORKING END-TO-END');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
  }
}

main();