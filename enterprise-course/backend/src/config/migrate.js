/* eslint-disable no-console */
require('dotenv').config();
const { initDatabase, pool } = require('./database');

async function runMigrations() {
  await initDatabase();
  console.log('Database migration completed successfully.');
}

runMigrations()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Migration error:', error.message);
    await pool.end();
    process.exit(1);
  });
