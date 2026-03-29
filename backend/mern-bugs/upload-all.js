const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const BASE_URL = 'https://sidechick.onrender.com'
const ADMIN_TOKEN = "THISISONLTFORHERINSTAYAWAY";
const ZIP_DIR = path.join(__dirname, 'zips');
const UPLOAD_SCRIPT = path.join(__dirname, '..', 'scripts', 'upload-problem.js');

const problems = [
  { file: 'fix-cart-total.zip', title: 'Fix Cart Total', slug: 'fix-cart-total' },
  { file: 'broken-auth.zip', title: 'Broken Auth Flow', slug: 'broken-auth' },
  { file: 'missing-await.zip', title: 'Missing Await', slug: 'missing-await' },
  { file: 'top-scorers.zip', title: 'Top Scorers Bug', slug: 'top-scorers' },
  { file: 'auth-bypass.zip', title: 'Auth Bypass', slug: 'auth-bypass' },
  { file: 'validator-bug.zip', title: 'Validator Bug', slug: 'validator-bug' },
  { file: 'profile-patch.zip', title: 'Profile Patch Bug', slug: 'profile-patch' },
  { file: 'header-misstep.zip', title: 'Header Misstep', slug: 'header-misstep' },
  { file: 'delete-logic.zip', title: 'Delete Logic', slug: 'delete-logic' },
  { file: 'structure-error.zip', title: 'Structure Error', slug: 'structure-error' }
];

console.log('--- UPLOADING PROBLEMS TO RENDER ---');

problems.forEach(p => {
  const zipPath = path.join(ZIP_DIR, p.file);
  if (!fs.existsSync(zipPath)) {
    console.error(`Missing zip: ${zipPath}`);
    return;
  }

  try {
    console.log(`Uploading ${p.title}...`);
    // Note: Assuming upload-problem.js accepts these flags
    execSync(`node "${UPLOAD_SCRIPT}" \
--file "${zipPath}" \
--title "${p.title}" \
--slug "${p.slug}" \
--token ${ADMIN_TOKEN} \
--url ${BASE_URL}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (err) {
    console.error(`Failed to upload ${p.title}:`, err.message);
  }
});

console.log('--- ALL UPLOADS FINISHED ---');
