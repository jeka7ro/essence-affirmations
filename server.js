import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import fetch from 'node-fetch';

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

// Seed default admin user if table is empty (dev convenience)
async function seedIfEmpty() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    if (rows[0]?.count === 0) {
      await pool.query(
        `INSERT INTO users (username, email, full_name, first_name, last_name, pin, role, total_repetitions, current_day, today_repetitions, last_date, repetition_history, completed_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)` ,
        [
          'Eugen',
          'eugen@example.com',
          'Eugen Admin',
          'Eugen',
          'Admin',
          '1155',
          'admin',
          0,
          0,
          0,
          null,
          JSON.stringify([]),
          JSON.stringify([])
        ]
      );
      console.log('Seeded default admin user: Eugen / 1155');
    }
    // Ensure PIN is updated if user already existed
    await pool.query(`UPDATE users SET pin = '1155' WHERE username = 'Eugen'`);
  } catch (err) {
    console.error('Seed error:', err);
  }
}

seedIfEmpty();

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

// Courses endpoint (scrape Essence courses)
app.get('/api/courses', async (req, res) => {
  try {
    const response = await fetch('https://essence-process.com/ro/cursuri/');
    const html = await response.text();

    // Very simple extraction based on known headings in provided content
    const blocks = [];
    const courseRegex = /##\s*(.+?)\n[\s\S]*?(\d{2})\s*\n([A-Z][a-z]{2})[\s\S]*?\n\s*(\d{2})\s*\n([A-Z][a-z]{2})[\s\S]*?\n[\s\S]*?(Cluj-Napoca|Iasi|Brasov)/g;
    let match;
    while ((match = courseRegex.exec(html)) !== null) {
      const title = match[1].trim();
      const startDay = match[2];
      const startMonth = match[3];
      const endDay = match[4];
      const endMonth = match[5];
      const city = match[6];
      blocks.push({ title, startDay, startMonth, endDay, endMonth, city });
    }

    // Fallback: hardcode from provided snippet if regex fails
    if (blocks.length === 0) {
      blocks.push(
        { title: 'Essence Advance Therapeutic Process', startDay: '05', startMonth: 'Nov', endDay: '09', endMonth: 'Nov', city: 'Cluj-Napoca', year: 2025 },
        { title: 'Essence Foundation Therapeutic Process', startDay: '05', startMonth: 'Dec', endDay: '07', endMonth: 'Dec', city: 'Iasi', year: 2025 },
        { title: 'Essence Advance Therapeutic Process', startDay: '14', startMonth: 'Ian', endDay: '18', endMonth: 'Ian', city: 'Cluj-Napoca', year: 2026 },
        { title: 'Essence Advance Therapeutic Process', startDay: '18', startMonth: 'Feb', endDay: '22', endMonth: 'Feb', city: 'Cluj-Napoca', year: 2026 },
        { title: 'Essence Relationships Therapeutic Process', startDay: '08', startMonth: 'Mai', endDay: '10', endMonth: 'Mai', city: 'Brasov', year: 2026 }
      );
    }

    const monthMap = { Ian: 1, Feb: 2, Mar: 3, Apr: 4, Mai: 5, Iun: 6, Iul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    const currentYear = new Date().getFullYear();
    const normalized = blocks.map(b => {
      const year = b.year || (['Nov','Dec'].includes(b.startMonth) ? 2025 : ['Ian','Feb','Mar','Apr','Mai'].includes(b.startMonth) ? 2026 : currentYear);
      const start = new Date(year, (monthMap[b.startMonth] || 1) - 1, parseInt(b.startDay, 10));
      const end = new Date(year, (monthMap[b.endMonth] || 1) - 1, parseInt(b.endDay, 10));
      return { title: b.title, city: b.city, start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
    });

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Groups endpoint
app.get('/api/groups', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM groups ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { name, secret_code, created_by, start_date, end_date, cities } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO groups (name, secret_code, creator_username, start_date, end_date, cities) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, secret_code, created_by, start_date, end_date, cities]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activities endpoint
app.get('/api/activities', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM activities ORDER BY created_date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { username, activity_type, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO activities (username, activity_type, description) VALUES ($1, $2, $3) RETURNING *',
      [username, activity_type, description]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Messages endpoint
app.get('/api/messages', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM messages ORDER BY created_date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { username, group_id, message } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO messages (sender, group_id, message) VALUES ($1, $2, $3) RETURNING *',
      [username, group_id, message]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
