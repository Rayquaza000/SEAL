require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./config/db');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/workspaces', require('./routes/workspace'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Initialize DB and start server
const PORT = process.env.PORT || 5000;

const initDB = async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await query(schema);
    console.log('✅ Database schema initialized');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
    process.exit(1);
  }
};

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 SEAL API running on port ${PORT}`);
  });
});

module.exports = app;
