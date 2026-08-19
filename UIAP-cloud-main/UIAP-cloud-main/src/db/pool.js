const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  // Unexpected errors on idle clients — log and let the process manager restart if needed
  console.error('[db] Unexpected error on idle client', err);
});

module.exports = pool;
