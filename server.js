// Force redeploy - CORS fix v7 - fix PathError with OPTIONS route
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://essence-affirmations.vercel.app',
    'https://essence-affirmations-backend.onrender.com',
    'https://www.myessence.ro',
    'https://myessence.ro'
  ],
  credentials: true
};

app.use(cors(corsOptions));

// Debug CORS middleware
app.use((req, res, next) => {
  console.log('CORS Debug:', {
    origin: req.headers.origin,
    method: req.method,
    url: req.url
  });
  
  // Force CORS headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  next();
});
// Handle preflight OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
        end_date DATE,
        cities TEXT,
        member_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add missing columns if they don't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='end_date') THEN
          ALTER TABLE groups ADD COLUMN end_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='cities') THEN
          ALTER TABLE groups ADD COLUMN cities TEXT;
        END IF;
      END $$;
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
          'jeka7ro@gmail.com',
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
    await pool.query(`UPDATE users SET pin = '1155' WHERE email = 'jeka7ro@gmail.com'`);
  } catch (err) {
    console.error('Seed error:', err);
  }
}

seedIfEmpty();

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', port: port });
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    
    console.log('DEBUG POST /api/users:', { username, email, first_name, last_name, phone, birth_date, pin, role });
    
    const result = await pool.query(
      'INSERT INTO users (username, email, full_name, first_name, last_name, phone, birth_date, pin, avatar, affirmation, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [username, email, full_name, first_name, last_name, phone, birth_date, pin, avatar, affirmation, role || 'user']
    );
    
    console.log('DEBUG POST /api/users success:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DEBUG POST /api/users error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('DEBUG PUT /api/users/:id:', { id, updates });
    
    // Validate that user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    console.log('DEBUG SQL:', `UPDATE users SET ${setClause} WHERE id = $1`);
    
    const result = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    
    console.log('DEBUG Update result:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DEBUG PUT /api/users/:id error:', err);
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

// Add a catch-all route for debugging
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    url: req.originalUrl,
    availableRoutes: ['/api/health', '/api/users', '/api/groups', '/api/activities', '/api/messages', '/api/courses']
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
});
