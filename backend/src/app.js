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

// Security HTTP headers
app.use(helmet());

// CORS config
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
  })
);

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

// 404 and global error handlers
app.use(notFoundMiddleware);
app.use(errorMiddleware);