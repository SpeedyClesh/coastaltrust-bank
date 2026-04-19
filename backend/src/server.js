const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { getDb } = require('./config/database');
const routes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Railway/Vercel proxy
app.set('trust proxy', 1);

// Initialize DB on startup
getDb();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS - allow both localhost and production
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'http://localhost:3000',
      'https://coastaltrust-bank.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      // Allow all vercel preview URLs too
      if (origin && origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - with proxy trust
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many login attempts.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Static files (uploads)
const uploadsPath = path.join(__dirname, '../uploads');
require('fs').mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ 
  status: 'CoastalTrust Bank API Running', 
  timestamp: new Date().toISOString() 
}));

// 404 handler
app.use('*', (req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('\n🏦 ================================================');
  console.log('   CoastalTrust Bank API Server Started');
  console.log('🏦 ================================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔑 Admin: admin@coastaltrust.com / Admin@CoastalTrust2024');
  console.log('================================================\n');
});

module.exports = app;
