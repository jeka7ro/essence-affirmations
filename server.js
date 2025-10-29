// Force redeploy - CORS fix v7 - fix PathError with OPTIONS route
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3001;

// Handle preflight OPTIONS requests FIRST - before all other middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.sendStatus(200);
});

// CORS configuration - Allow all origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow all origins
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};

app.use(cors(corsOptions));

// Debug CORS middleware
app.use((req, res, next) => {
  console.log('CORS Debug:', {
    origin: req.headers.origin,
    method: req.method,
    url: req.url
  });
  
  // Force CORS headers for all responses
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
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
        sex VARCHAR(1),
        pin VARCHAR(10),
        avatar TEXT,
        affirmation TEXT,
        preferences TEXT,
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
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferences') THEN
          ALTER TABLE users ADD COLUMN preferences TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='sex') THEN
          ALTER TABLE users ADD COLUMN sex VARCHAR(1);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='type') THEN
          ALTER TABLE messages ADD COLUMN type VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='recipient') THEN
          ALTER TABLE messages ADD COLUMN recipient VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='group_joined_at') THEN
          ALTER TABLE users ADD COLUMN group_joined_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // User backups table (point-in-time snapshots of progress)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_backups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        today_repetitions INTEGER,
        total_repetitions INTEGER,
        current_day INTEGER,
        last_date DATE,
        repetition_history TEXT,
        completed_days TEXT,
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

    // Courses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        city VARCHAR(255),
        start_date DATE,
        end_date DATE,
        link TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

// Seed courses if table is empty
async function seedCourses() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM courses');
    if (rows[0]?.count === 0) {
      // Courses from https://essence-process.com/ro/cursuri/
      const courses = [
        {
          title: 'Essence Advance Therapeutic Process',
          city: 'Cluj-Napoca',
          start_date: '2025-11-05',
          end_date: '2025-11-09',
          link: 'https://essence-process.com/ro/cursuri/',
          description: 'Cursul Advance te duce la un nivel mult mai adânc, unde vei dezvolta convingeri pozitive noi și tipare comportamentale care îți îmbogățesc viața.'
        },
        {
          title: 'Essence Foundation Therapeutic Process',
          city: 'Iasi',
          start_date: '2025-12-05',
          end_date: '2025-12-07',
          link: 'https://essence-process.com/ro/cursuri/',
          description: 'Curs extrem de practic unde participanții trăiesc o experiență blândă și distractivă, timp de trei zile, pe structura unor exerciții educaționale și interactive.'
        },
        {
          title: 'Essence Advance Therapeutic Process',
          city: 'Cluj-Napoca',
          start_date: '2026-01-14',
          end_date: '2026-01-18',
          link: 'https://essence-process.com/ro/cursuri/',
          description: 'Cursul Advance te duce la un nivel mult mai adânc, unde vei dezvolta convingeri pozitive noi și tipare comportamentale care îți îmbogățesc viața.'
        },
        {
          title: 'Essence Advance Therapeutic Process',
          city: 'Cluj-Napoca',
          start_date: '2026-02-18',
          end_date: '2026-02-22',
          link: 'https://essence-process.com/ro/cursuri/',
          description: 'Cursul Advance te duce la un nivel mult mai adânc, unde vei dezvolta convingeri pozitive noi și tipare comportamentale care îți îmbogățesc viața.'
        },
        {
          title: 'Essence Relationships Therapeutic Process',
          city: 'Brasov',
          start_date: '2026-05-08',
          end_date: '2026-05-10',
          link: 'https://essence-process.com/ro/cursuri/',
          description: 'Cursul oferă o oportunitate valoroasă de a construi relații mai bune cu partenerii noștri, cu familiile, prietenii, colegii și nu în ultimul rând, cu noi înșine.'
        }
      ];

      for (const course of courses) {
        await pool.query(
          'INSERT INTO courses (title, city, start_date, end_date, link, description) VALUES ($1, $2, $3, $4, $5, $6)',
          [course.title, course.city, course.start_date, course.end_date, course.link, course.description]
        );
      }
      console.log(`Seeded ${courses.length} courses`);
    }
  } catch (err) {
    console.error('Seed courses error:', err);
  }
}

seedCourses();

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

// Get backups for a user (latest first)
app.get('/api/users/:id/backups', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM user_backups WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // First, remove user from any group
    await pool.query('UPDATE users SET group_id = NULL WHERE id = $1', [id]);
    // Delete user backups
    await pool.query('DELETE FROM user_backups WHERE user_id = $1', [id]);
    // Delete user
    const { rows } = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, deleted: rows[0] });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
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
    const { username, email, full_name, first_name, last_name, phone, birth_date, sex, pin, avatar, affirmation, preferences, role, 
            total_repetitions, current_day, today_repetitions, last_date, repetition_history, completed_days, challenge_start_date } = req.body;
    
    console.log('DEBUG POST /api/users:', { username, email, first_name, last_name, phone, birth_date, sex, pin, role });
    
    const result = await pool.query(
      `INSERT INTO users (
        username, email, full_name, first_name, last_name, phone, birth_date, sex, pin, avatar, affirmation, preferences, role,
        total_repetitions, current_day, today_repetitions, last_date, repetition_history, completed_days, challenge_start_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
      [
        username, email, full_name, first_name, last_name, phone, birth_date, sex, pin, avatar, affirmation, preferences, role || 'user',
        total_repetitions || 0, current_day || 0, today_repetitions || 0, last_date, repetition_history, completed_days, challenge_start_date
      ]
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
    const updates = req.body || {};

    console.log('DEBUG PUT /api/users/:id:', { id, updates });

    // Validate user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Whitelist of updatable columns
    const allowedFields = new Set([
      'username','email','full_name','first_name','last_name','phone','birth_date','sex','pin','avatar','affirmation','preferences','role',
      'total_repetitions','current_day','today_repetitions','last_date','repetition_history','completed_days','challenge_start_date','last_login','group_id'
    ]);

    // Sanitize values: empty strings -> null for date/timestamp/text fields
    const dateFields = new Set(['birth_date','last_date','challenge_start_date','last_login']);
    const numericFields = new Set(['total_repetitions','current_day','today_repetitions','group_id']);

    const sanitizedEntries = Object.entries(updates)
      .filter(([k]) => allowedFields.has(k))
      .map(([k, v]) => {
        if (v === '') return [k, null];
        if (dateFields.has(k)) return [k, v || null];
        if (numericFields.has(k)) return [k, v === '' || v === null || v === undefined ? null : Number(v)];
        return [k, v];
      });

    if (sanitizedEntries.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const columns = sanitizedEntries.map(([k]) => k);
    const values = sanitizedEntries.map(([_, v]) => v);
    const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    const sql = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;

    console.log('DEBUG SQL:', sql, { columns });

    const result = await pool.query(sql, [id, ...values]);
    console.log('DEBUG Update result:', result.rows[0]);
    // Backup snapshot if progress fields changed
    try {
      const progressKeys = new Set(['today_repetitions','total_repetitions','current_day','last_date','repetition_history','completed_days']);
      const changedProgress = columns.some(k => progressKeys.has(k));
      if (changedProgress) {
        const u = result.rows[0];
        await pool.query(
          `INSERT INTO user_backups (user_id, today_repetitions, total_repetitions, current_day, last_date, repetition_history, completed_days)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [u.id, u.today_repetitions || 0, u.total_repetitions || 0, u.current_day || 0, u.last_date || null, u.repetition_history || null, u.completed_days || null]
        );
      }
    } catch (e) {
      console.error('Backup insert error:', e);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DEBUG PUT /api/users/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Courses endpoints - Get all courses from database (only future/current courses)
app.get('/api/courses', async (req, res) => {
  try {
    // Filter out expired courses (where end_date < today)
    const { rows } = await pool.query(`
      SELECT * FROM courses 
      WHERE end_date >= CURRENT_DATE OR end_date IS NULL
      ORDER BY start_date ASC, created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/courses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create course (admin only)
app.post('/api/courses', async (req, res) => {
  try {
    const { title, city, start_date, end_date, link, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO courses (title, city, start_date, end_date, link, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, city || null, start_date || null, end_date || null, link || null, description || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/courses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update course (admin only)
app.put('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, city, start_date, end_date, link, description } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(city || null);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(start_date || null);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(end_date || null);
    }
    if (link !== undefined) {
      updates.push(`link = $${paramIndex++}`);
      values.push(link || null);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await pool.query(sql, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/courses/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete course (admin only)
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ success: true, deleted: rows[0] });
  } catch (err) {
    console.error('DELETE /api/courses/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Force seed courses endpoint (for admin/debugging)
app.post('/api/courses-seed', async (req, res) => {
  try {
    // Delete existing courses first
    await pool.query('DELETE FROM courses');
    
    // Insert courses
    const courses = [
      {
        title: 'Essence Advance Therapeutic Process',
        city: 'Cluj-Napoca',
        start_date: '2025-11-05',
        end_date: '2025-11-09',
        link: 'https://essence-process.com/ro/cursuri/',
        description: 'Cursul Advance te duce la un nivel mult mai adânc, unde vei dezvolta convingeri pozitive noi și tipare comportamentale care îți îmbogățesc viața.'
      },
      {
        title: 'Essence Foundation Therapeutic Process',
        city: 'Iasi',
        start_date: '2025-12-05',
        end_date: '2025-12-07',
        link: 'https://essence-process.com/ro/cursuri/',
        description: 'Curs extrem de practic unde participanții trăiesc o experiență blândă și distractivă, timp de trei zile, pe structura unor exerciții educaționale și interactive.'
      },
      {
        title: 'Essence Advance Therapeutic Process',
        city: 'Cluj-Napoca',
        start_date: '2026-01-14',
        end_date: '2026-01-18',
        link: 'https://essence-process.com/ro/cursuri/',
        description: 'Cursul Advance te duce la un nivel mult mai adânc, unde vei dezvolta convingeri pozitive noi și tipare comportamentale care îți îmbogățesc viața.'
      },
      {
        title: 'Essence Advance Therapeutic Process',
        city: 'Cluj-Napoca',
        start_date: '2026-02-18',
        end_date: '2026-02-22',
        link: 'https://essence-process.com/ro/cursuri/',
        description: 'Cursul Advance te duce la un nivel mult mai adânc, unde vei dezvolta convingeri pozitive noi și tipare comportamentale care îți îmbogățesc viața.'
      },
      {
        title: 'Essence Relationships Therapeutic Process',
        city: 'Brasov',
        start_date: '2026-05-08',
        end_date: '2026-05-10',
        link: 'https://essence-process.com/ro/cursuri/',
        description: 'Cursul oferă o oportunitate valoroasă de a construi relații mai bune cu partenerii noștri, cu familiile, prietenii, colegii și nu în ultimul rând, cu noi înșine.'
      }
    ];

    const inserted = [];
    for (const course of courses) {
      const { rows } = await pool.query(
        'INSERT INTO courses (title, city, start_date, end_date, link, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [course.title, course.city, course.start_date, course.end_date, course.link, course.description]
      );
      inserted.push(rows[0]);
    }
    
    res.json({ success: true, count: inserted.length, courses: inserted });
  } catch (err) {
    console.error('POST /api/courses-seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Old scraping endpoint - kept for migration
app.get('/api/courses-scrape', async (req, res) => {
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

app.put('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const allowedFields = ['name', 'description', 'start_date', 'end_date', 'cities', 'secret_code', 'is_active'];
    const sanitized = {};
    for (const key of allowedFields) {
      if (updates.hasOwnProperty(key)) {
        if (key === 'is_active') {
          sanitized[key] = updates[key] === true || updates[key] === 'true';
        } else {
          sanitized[key] = updates[key] || null;
        }
      }
    }
    if (Object.keys(sanitized).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const setClause = Object.keys(sanitized).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
    const values = Object.values(sanitized);
    const { rows } = await pool.query(
      `UPDATE groups SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/groups/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json({ success: true, deleted: rows[0] });
  } catch (err) {
    console.error('DELETE /api/groups/:id error:', err);
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
    const { sender, username, group_id, message, type, recipient } = req.body;
    // Support both 'sender' and 'username' for backward compatibility
    const senderValue = sender || username;
    const { rows } = await pool.query(
      'INSERT INTO messages (sender, group_id, message, type, recipient) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [senderValue, group_id || null, message, type || 'group', recipient || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/messages error:', err);
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
    availableRoutes: ['/api/health', '/api/users', '/api/groups', '/api/activities', '/api/messages', '/api/courses', '/api/courses-scrape', '/api/courses-seed']
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
});
