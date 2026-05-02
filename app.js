const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');
const path = require('path');
const { Pool } = require('pg');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global error handlers for server stability
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // Don't exit the process, just log the error
  // process.exit(1); // Commented out to prevent server stop
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Memory monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  // Log memory usage if it gets high
  if (memUsageMB.heapUsed > 100) {
    console.log('High memory usage detected:', memUsageMB);
  }
}, 300000); // Check every 5 minutes

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 second timeout
  res.setTimeout(30000);
  next();
});

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Database query helper with error handling
const db = {
  async run(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', { query, error });
      throw error;
    }
  },
  async get(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Database query error:', { query, error });
      throw error;
    }
  },
  async all(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result.rows || [];
    } catch (error) {
      console.error('Database query error:', { query, error });
      throw error;
    }
  }
};

// Configure multer for file uploads with error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Enhanced session configuration with PostgreSQL
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'kabianga-tracker-secret-' + Date.now(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 4, // 4 hours
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      httpOnly: true,
      sameSite: 'strict'
    }
  })
);

let server;

async function createDatabase() {
  try {
    console.log('Initializing PostgreSQL database connection...');
    
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('Database connection successful');

    // Initialize tables
    await initializeTables();
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function initializeTables() {
  try {
    // Create session table for express-session
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" on "session" ("expire");
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        image TEXT,
        phone TEXT,
        status TEXT NOT NULL,
        reported_by INTEGER NOT NULL REFERENCES users(id),
        claimed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create claims table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      );
    `);

    console.log('Database tables initialized successfully');

    // Create default accounts if they don't exist
    await createDefaultAccounts();

  } catch (error) {
    console.error('Table initialization error:', error);
    throw error;
  }
}

async function createDefaultAccounts() {
  try {
    // Check if default accounts already exist
    const existingAdmin = await db.get('SELECT * FROM users WHERE username = $1', ['admin']);
    const existingSecurity = await db.get('SELECT * FROM users WHERE username = $1', ['security']);

    if (!existingAdmin) {
      const hashedAdminPassword = await bcrypt.hash('THEFABULOUS', 10);
      await db.run(
        'INSERT INTO users (name, email, username, password, role) VALUES ($1, $2, $3, $4, $5)',
        ['System Administrator', 'admin@kabianga.edu', 'admin', hashedAdminPassword, 'admin']
      );
      console.log('Default admin account created');
    }

    if (!existingSecurity) {
      const hashedSecurityPassword = await bcrypt.hash('securityadmin@26', 10);
      await db.run(
        'INSERT INTO users (name, email, username, password, role) VALUES ($1, $2, $3, $4, $5)',
        ['Security Officer', 'security@kabianga.edu', 'security', hashedSecurityPassword, 'security']
      );
      console.log('Default security account created');
    }

  } catch (error) {
    console.error('Error creating default accounts:', error);
  }
}

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
      return res.status(403).render('forbidden', { title: 'Forbidden' });
    }
    next();
  };
}

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Kabianga Lost & Track Login', error: null });
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Kabianga Lost & Track Login', error: null });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);

    if (!user) {
      return res.render('login', { title: 'Kabianga Lost & Track Login', error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.render('login', { title: 'Kabianga Lost & Track Login', error: 'Invalid credentials.' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    };

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { title: 'Kabianga Lost & Track Login', error: 'An error occurred during login. Please try again.' });
  }
});

app.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'University Registration', error: null });
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;
    if (!name || !email || !username || !password || !role) {
      return res.render('register', { title: 'University Registration', error: 'All fields are required.' });
    }

    // Validate role
    if (!['user', 'staff'].includes(role)) {
      return res.render('register', { title: 'University Registration', error: 'Invalid role selected.' });
    }

    const existing = await db.get('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing) {
      return res.render('register', { title: 'University Registration', error: 'Email or username already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO users (name, email, username, password, role) VALUES ($1, $2, $3, $4, $5)',
      [name, email, username, hashed, role]
    );

    res.render('login', { title: 'Kabianga Lost & Track Login', error: 'Registration successful. Please log in.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', { title: 'University Registration', error: 'An error occurred during registration. Please try again.' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/dashboard', requireLogin, (req, res) => {
  const role = req.session.user.role;
  if (role === 'admin') return res.redirect('/admin');
  if (role === 'security') return res.redirect('/security');
  // Both students (user) and staff can access the main user interface
  return res.redirect('/user');
});

app.get('/report', requireLogin, (req, res) => {
  if (!['user', 'staff'].includes(req.session.user.role)) return res.redirect('/dashboard');
  res.redirect('/user#report');
});

app.get('/browse', requireLogin, (req, res) => {
  if (!['user', 'staff'].includes(req.session.user.role)) return res.redirect('/dashboard');
  res.redirect('/user#browse');
});

app.get('/admin', requireLogin, requireRole('admin'), async (req, res) => {
  const [userCount, itemStats, pendingClaims] = await Promise.all([
    db.get('SELECT COUNT(*) AS count FROM users'),
    db.get(`
      SELECT
        COUNT(*) AS count,
        SUM(CASE WHEN type = 'found' THEN 1 ELSE 0 END) AS found,
        SUM(CASE WHEN type = 'lost' THEN 1 ELSE 0 END) AS lost
      FROM items
    `),
    db.get("SELECT COUNT(*) AS count FROM claims WHERE status = 'pending'")
  ]);

  const items = await db.all(
    `SELECT items.*, users.name AS reporter FROM items JOIN users ON items.reported_by = users.id ORDER BY items.created_at DESC LIMIT 50`
  );
  const claims = await db.all(
    `SELECT claims.*, items.title AS item_title, users.name AS claimant FROM claims JOIN items ON claims.item_id = items.id JOIN users ON claims.user_id = users.id ORDER BY claims.requested_at DESC LIMIT 20`
  );

  res.render('admin', {
    title: 'Admin Dashboard',
    metrics: {
      users: userCount.count,
      items: itemStats.count,
      found: itemStats.found || 0,
      lost: itemStats.lost || 0,
      claims: pendingClaims.count
    },
    items,
    claims
  });
});

app.get('/security', requireLogin, requireRole('security'), async (req, res) => {
  const items = await db.all(
    `SELECT items.*, users.name AS reporter FROM items JOIN users ON items.reported_by = users.id ORDER BY items.updated_at DESC`);
  const claims = await db.all(
    `SELECT claims.*, items.title AS item_title, users.name AS claimant FROM claims JOIN items ON claims.item_id = items.id JOIN users ON claims.user_id = users.id WHERE claims.status = 'pending' ORDER BY claims.requested_at DESC`
  );
  res.render('security', { title: 'Security Office', items, claims });
});

app.get('/user', requireLogin, async (req, res) => {
  if (!['user', 'staff'].includes(req.session.user.role)) return res.redirect('/dashboard');
  const user = req.session.user;
  const myItems = await db.all('SELECT * FROM items WHERE reported_by = $1 ORDER BY updated_at DESC', [user.id]);
  const availableClaims = await db.all(
    `SELECT items.*, users.name AS reporter FROM items JOIN users ON items.reported_by = users.id WHERE items.type = 'found' AND items.status = 'ready_for_claim' AND items.reported_by != ? ORDER BY items.updated_at DESC`,
    [user.id]
  );
  const myClaims = await db.all(
    `SELECT claims.*, items.title AS item_title, items.status AS item_status FROM claims JOIN items ON claims.item_id = items.id WHERE claims.user_id = ? ORDER BY claims.requested_at DESC`,
    [user.id]
  );
  const portalTitle = user.role === 'staff' ? 'Staff Portal' : 'Student Portal';
  res.render('user', { title: portalTitle, userItems: myItems, claimables: availableClaims, myClaims });
});

app.post('/report-item', requireLogin, upload.single('image'), async (req, res) => {
  try {
    if (!['user', 'staff'].includes(req.session.user.role)) return res.redirect('/dashboard');
    const { title, description, location, type, category, phone } = req.body;
    if (!title || !description || !location || !type || !category) {
      return res.redirect('/user');
    }

    const now = new Date().toISOString();
    const status = type === 'found' ? 'with_security' : 'reported_lost';
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    await db.run(
      `INSERT INTO items (title, description, location, type, category, image, phone, status, reported_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [title, description, location, type, category, imagePath, phone, status, req.session.user.id, now, now]
    );
    res.redirect('/user');
  } catch (error) {
    console.error('Report item error:', error);
    res.redirect('/user'); // Redirect back to user page on error
  }
});

app.post('/items/:id/prepare-claim', requireLogin, requireRole('security'), async (req, res) => {
  try {
    const itemId = req.params.id;
    await db.run(`UPDATE items SET status = $1, updated_at = $2 WHERE id = $3 AND type = $4`, ['ready_for_claim', new Date().toISOString(), itemId, 'found']);
    res.redirect('/security');
  } catch (error) {
    console.error('Prepare claim error:', error);
    res.redirect('/security');
  }
});

app.post('/items/:id/mark-claimed', requireLogin, requireRole('security'), async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await db.get('SELECT * FROM items WHERE id = $1', [itemId]);
    if (item && item.type === 'lost') {
      await db.run(`UPDATE items SET status = $1, claimed_by = $2, updated_at = $3 WHERE id = $4`, ['claimed', item.reported_by, new Date().toISOString(), itemId]);
    }
    res.redirect('/security');
  } catch (error) {
    console.error('Mark claimed error:', error);
    res.redirect('/security');
  }
});

app.post('/items/:id/request-claim', requireLogin, requireRole('user'), async (req, res) => {
  try {
    const itemId = req.params.id;
    const existing = await db.get('SELECT * FROM claims WHERE item_id = $1 AND user_id = $2 AND status = $3', [itemId, req.session.user.id, 'pending']);
    if (!existing) {
      await db.run(
        `INSERT INTO claims (item_id, user_id, status, requested_at) VALUES ($1, $2, $3, $4)`,
        [itemId, req.session.user.id, 'pending', new Date().toISOString()]
      );
    }
    res.redirect('/user');
  } catch (error) {
    console.error('Request claim error:', error);
    res.redirect('/user');
  }
});

app.post('/claims/:id/approve', requireLogin, requireRole('security'), async (req, res) => {
  try {
    const claimId = req.params.id;
    const claim = await db.get('SELECT * FROM claims WHERE id = $1', [claimId]);
    if (claim) {
      await db.run('UPDATE claims SET status = $1, processed_at = $2 WHERE id = $3', ['approved', new Date().toISOString(), claimId]);
      await db.run('UPDATE items SET status = $1, claimed_by = $2, updated_at = $3 WHERE id = $4', ['claimed', claim.user_id, new Date().toISOString(), claim.item_id]);
    }
    res.redirect('/security');
  } catch (error) {
    console.error('Approve claim error:', error);
    res.redirect('/security');
  }
});

app.post('/claims/:id/reject', requireLogin, requireRole('security'), async (req, res) => {
  try {
    const claimId = req.params.id;
    await db.run('UPDATE claims SET status = $1, processed_at = $2 WHERE id = $3', ['rejected', new Date().toISOString(), claimId]);
    res.redirect('/security');
  } catch (error) {
    console.error('Reject claim error:', error);
    res.redirect('/security');
  }
});

app.get('/reports', requireLogin, async (req, res) => {
  const role = req.session.user.role;
  if (role === 'user') {
    return res.redirect('/dashboard');
  }
  const items = await db.all(
    `SELECT items.*, users.name AS reporter FROM items JOIN users ON items.reported_by = users.id ORDER BY items.created_at DESC`
  );
  const claims = await db.all(
    `SELECT claims.*, items.title AS item_title, users.name AS claimant FROM claims JOIN items ON claims.item_id = items.id JOIN users ON claims.user_id = users.id ORDER BY claims.requested_at DESC`
  );
  res.render('reports', { title: 'System Reports', items, claims, role });
});

// Health check endpoint for monitoring
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.get('SELECT 1');
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
      },
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Application error:', err);

  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send('File too large. Maximum size is 5MB.');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).send('Too many files uploaded.');
    }
  }

  // Handle other errors
  if (err.message === 'Only image files are allowed') {
    return res.status(400).send('Only image files are allowed.');
  }

  // Database errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    console.error('Database error:', err);
    return res.status(500).send('Database error occurred. Please try again.');
  }

  // Generic error response
  res.status(500).send('An unexpected error occurred. Please try again.');
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Graceful server startup
async function startServer() {
  try {
    await createDatabase();
    server = app.listen(PORT, () => {
      console.log(`Kabianga Lost & Track System running on http://localhost:${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error('Failed to start application:', err);
    process.exit(1);
  }
}

startServer();
