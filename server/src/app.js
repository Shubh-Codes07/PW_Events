import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { eventsRouter } from './routes/events.js';
import { sharedRouter } from './routes/shared.js';

export const app = express();

// Trust reverse proxy (e.g. Vercel, Railway, Render, Nginx) so rate limiting works accurately behind proxies
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Allowed origins support comma-separated list or single origin
const allowedOrigins = (env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Supertest)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parser with strict size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});
app.use(limiter);

// Health check endpoint (always public)
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'utsav-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Main API routes
app.use('/api/events', eventsRouter);
app.use('/api/shared', sharedRouter);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
});

// Centralized error handler
app.use(errorHandler);
