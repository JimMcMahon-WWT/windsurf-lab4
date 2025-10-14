import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFound } from './middlewares/error.middleware';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
