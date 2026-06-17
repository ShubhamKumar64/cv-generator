require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'cv',
  port: process.env.DB_PORT || 5432
});

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running schema.sql...');
    await pool.query(sql);
    console.log('Schema created/verified successfully.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error running schema:', err);
    await pool.end().catch(()=>{});
    process.exit(1);
  }
}

run();
