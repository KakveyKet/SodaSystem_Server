import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import customerRoutes from './routes/customer.routes.js';
import lotteryChiefBalanceRoutes from './routes/lotteryChiefBalance.routes.js';
import chiefExpenseRoutes from './routes/chiefExpense.routes.js';
import lotteryPlayRoutes from './routes/lotteryPlay.routes.js';
import rateRoutes from './routes/rate.routes.js';
import customerInvoiceRoutes from "./routes/customerInvoice.routes.js";
import {
  swaggerUi,
  swaggerSpec,
  swaggerUiOptions
} from './docs/swagger.js';

import { notFound, errorHandler } from './middleware/error.middleware.js';

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(limiter);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  res.json({
    message: 'API is running'
  });
});

/**
 * Swagger API Documentation
 */
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/lottery-chief-balances', lotteryChiefBalanceRoutes);
app.use('/api/chief-expenses', chiefExpenseRoutes);
app.use('/api/lottery-plays', lotteryPlayRoutes);
app.use('/api/rates', rateRoutes);
app.use(
  "/api/customer-invoices",
  customerInvoiceRoutes
);
/**
 * Error Middleware
 */
app.use(notFound);
app.use(errorHandler);

export default app;