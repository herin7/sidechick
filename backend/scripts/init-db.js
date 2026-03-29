#!/usr/bin/env node
const { initializeSchema, pool } = require('../src/db');

async function main() {
  await initializeSchema();
  process.stdout.write('PostgreSQL schema initialized successfully.\n');
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
