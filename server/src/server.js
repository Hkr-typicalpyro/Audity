import './config/init.js';

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import hallRoutes from './routes/hallRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import blackoutRoutes from './routes/blackoutRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import organiserRoutes from './routes/organiserRoutes.js';
import { securityHeaders } from './middleware/securityMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

// --------------- Middleware ---------------

// Apply lightweight security HTTP headers
app.use(securityHeaders);

// Parse incoming JSON request bodies with production body limit
app.use(express.json({ limit: '100kb' }));

// Enable CORS for Next.js frontend (default localhost:3000 or configurable via env)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// --------------- Routes ---------------

// Health-check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Audity API is running',
  });
});

app.use('/api/halls', hallRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/blackouts', blackoutRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Organiser application routes
app.use('/api/organiser', organiserRoutes);

// --------------- Start ---------------

const startServer = async () => {
  // Connect to MongoDB before accepting any traffic
  await connectDB();

  app.listen(PORT, () => {
    console.log(`✓ Audity API server listening on port ${PORT}`);
    console.log(`  Health check → http://localhost:${PORT}/api/health`);
  });
};

startServer();
