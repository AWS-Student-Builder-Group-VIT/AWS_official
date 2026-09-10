import pool from './db.js';

const createTableText = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function setupDatabase() {
  try {
    console.log('Connecting to database...');
    await pool.query(createTableText);
    console.log('Users table created or already exists.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    pool.end();
  }
}

setupDatabase();
