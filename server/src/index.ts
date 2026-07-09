import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Router
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Logger]:', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

app.listen(config.port, () => {
  console.log(`[Express API Gateway] Server is running on port ${config.port}`);
});
