import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import routes from './routes/index.js';

export const app = express();

app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet());

// CORS config
const allowedOrigins = [
  'https://optics-crm-1.onrender.com',
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:' + env.PORT,
  'http://127.0.0.1:' + env.PORT,
];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin, such as mobile apps, curl, or Postman.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parser
app.use(express.json());

// Request correlation ID
app.use(requestIdMiddleware);

// Structured HTTP logging
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

// Mount central router
app.use(routes);

// Serve the built React app from the same local process, without a CDN.
if (env.NODE_ENV === 'production') {
  const frontendDist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 and global error handlers
app.use(notFoundMiddleware);
app.use(errorMiddleware);