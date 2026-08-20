const knex = require('knex');
require('dotenv').config();

// Auto-detect client type (default to mysql2 for cPanel)
let client = 'mysql2';
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  client = 'pg';
} else if (process.env.DB_CLIENT === 'pg') {
  client = 'pg';
}

const connection = process.env.DATABASE_URL || {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const db = knex({
  client: client,
  connection: connection,
  pool: { min: 0, max: 10 }
});

// For backward compatibility while refactoring routes:
// Expose a raw query helper that mimics the pg pool interface
db.query = async (text, params) => {
  // Convert Postgres $1, $2 to MySQL ?, ?
  let sql = text.replace(/\$\d+/g, '?');
  const result = await db.raw(sql, params);
  
  // Normalize result format between pg and mysql2
  if (client === 'mysql2') {
    return { rows: result[0], rowCount: result[0].length || 0 };
  } else {
    return result; // pg already returns { rows, rowCount }
  }
};

module.exports = db;
