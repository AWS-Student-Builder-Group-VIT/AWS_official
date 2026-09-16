import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// The workspace keeps a single .env.local at the repository root; plain
// .env is loaded afterwards so it can fill any gaps without overriding.
dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

export default pool;
