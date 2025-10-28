import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// PostgreSQL connection - use DATABASE_URL from environment for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/essence_affirmations',
  host: process.env.DATABASE_URL ? undefined : 'localhost',
  port: process.env.DATABASE_URL ? undefined : 5432,
  database: process.env.DATABASE_URL ? undefined : 'essence_affirmations',
  user: process.env.DATABASE_URL ? undefined : 'eugeniucazmal'
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

// Initialize tables
async function initializeTables() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        full_name VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(50),
        birth_date DATE,
        pin VARCHAR(10),
        avatar TEXT,
        affirmation TEXT,
        role VARCHAR(50) DEFAULT 'user',
        total_repetitions INTEGER DEFAULT 0,
        current_day INTEGER DEFAULT 0,
        today_repetitions INTEGER DEFAULT 0,
        last_date DATE,
        repetition_history TEXT,
        completed_days TEXT,
        challenge_start_date DATE,
        last_login TIMESTAMP,
        group_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Groups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        secret_code VARCHAR(50),
        creator_username VARCHAR(255),
        start_date DATE,
        member_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        activity_type VARCHAR(100),
        description TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        group_id INTEGER,
        sender VARCHAR(255),
        message TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables initialized');
  } catch (err) {
    console.error('Error initializing tables:', err);
  }
}

initializeTables();

// API Routes

// Users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, email, full_name, first_name, last_name, phone, birth_date, pin, avatar, affirmation, role } = req.body;
    const result = await pool.query(
      'INSERT INTO users (username, email, full_name, first_name, last_name, phone, birth_date, pin, avatar, affirmation, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [username, email, full_name, first_name, last_name, phone, birth_date, pin, avatar, affirmation, role || 'user']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

