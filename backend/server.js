require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./utils/excelDb');

const usersRouter = require('./routes/users');
const attendanceRouter = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' })); // Large enough for descriptor arrays
app.use(express.urlencoded({ extended: true }));

// Request logger (dev mode)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/users', usersRouter);
app.use('/api/attendance', attendanceRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    dbState: 'connected (excel)',
    timestamp: new Date().toISOString(),
  });
});


// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Database + Server Start ──────────────────────────────────────────────────

try {
  initDb();
  console.log(`✅  Excel DB initialized at data.xlsx`);
  app.listen(PORT, () => {
    console.log(`🚀  Backend running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('❌  Excel DB initialization failed:', err.message);
  process.exit(1);
}
