// index.js
import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRouter from './routers/authRouter.js';
import questionRouter from './routers/questionRouter.js';
import uploadRouter from './routers/uploadRouter.js';
import adminRouter from './routers/adminRouter.js';
import profileRouter from './routers/profileRouter.js';
import userRouter from './routers/userRouter.js';
import { connect } from 'mongoose';

// ---------- DB ----------
connect(process.env.MONGO_URI)
  .then(() => console.log('Database Connected!'))
  .catch(err => console.error(err));

const app = express();

const isProd = process.env.NODE_ENV === 'production';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (isProd) app.set('trust proxy', 1);

// ---------- Enhanced CORS for Mobile (JWT-Friendly) ----------
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin matches our frontend
      if (origin === CLIENT_ORIGIN) {
        return callback(null, true);
      }
      
      if (!isProd && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With', 
      'Content-Type', 
      'Accept',
      'Authorization',
      'Cache-Control'
    ],
    optionsSuccessStatus: 200,
  })
);

// ---------- Mobile-Friendly Security Headers ----------
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// ---------- Parsers ----------
app.use(json());
app.use(urlencoded({ extended: true }));


// ---------- App Routes ----------
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    auth: 'JWT'
  });
});

app.use('/api/uploads', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/questions', questionRouter);
app.use('/api/admin', adminRouter);
app.use('/api/profile', profileRouter);
app.use('/api/users', userRouter);

// Health endpoint for load balancers
app.get('/healthz', (req, res) => res.send('ok'));

// ---------- Error Handling ----------
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      message: 'CORS error - origin not allowed',
      origin: req.headers.origin 
    });
  }
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ---------- Start ----------
const PORT = Number(process.env.PORT || 8000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Client Origin: ${CLIENT_ORIGIN}`);
  console.log(`🔐 Auth: JWT (No Sessions)`);
});
