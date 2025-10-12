// index.js
import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connect } from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import authRouter from './routers/authRouter.js';
import questionRouter from './routers/questionRouter.js';
import uploadRouter from './routers/uploadRouter.js';
import adminRouter from './routers/adminRouter.js';
import profileRouter from './routers/profileRouter.js';
import userRouter from './routers/userRouter.js';

// ---------- DB ----------
connect(process.env.MONGO_URI)
  .then(() => console.log('Database Connected!'))
  .catch(err => console.error(err));

const app = express();

const isProd = process.env.NODE_ENV === 'production';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// If you run behind a reverse proxy/load balancer in prod (e.g. Fly/Render/Nginx)
if (isProd) app.set('trust proxy', 1);

// ---------- Security/CORS ----------
app.use(helmet());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

// ---------- Parsers ----------
app.use(cookieParser());
app.use(json());
app.use(urlencoded({ extended: true }));

// ---------- Session ----------
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      httpOnly: true,
      // Local dev over http://localhost -> not secure, Lax is fine (and easiest).
      // Production over HTTPS and cross-site -> must be Secure + SameSite=None
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// ---------- App Routes ----------
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/uploads', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/questions', questionRouter);
app.use('/api/admin', adminRouter);
app.use('/api/profile', profileRouter);
app.use('/api/users', userRouter);

// Health
app.get('/healthz', (req, res) => res.send('ok'));

// ---------- Start ----------
const PORT = Number(process.env.PORT || 8000);
app.listen(PORT, '0.0.0.0', () => {
  console.log('Listening on port', PORT);
});
