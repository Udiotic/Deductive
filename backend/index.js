// index.js - Cleaned up with separated socket handlers
import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import authRouter from './routers/authRouter.js';
import questionRouter from './routers/questionRouter.js';
import uploadRouter from './routers/uploadRouter.js';
import adminRouter from './routers/adminRouter.js';
import profileRouter from './routers/profileRouter.js';
import userRouter from './routers/userRouter.js';
import validationRouter from './routers/validationRouter.js'
import roomRouter from './routers/roomRouter.js';
import User from './models/userModel.js';
import { connect } from 'mongoose';
import { setupSocketHandlers } from './socket/socketHandlers.js'; // ✅ Import socket handlers

// ---------- DB ----------
connect(process.env.MONGO_URI)
  .then(() => console.log('Database Connected!'))
  .catch(err => console.error(err));

const app = express();
const server = createServer(app);

const isProd = process.env.NODE_ENV === 'production';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (isProd) app.set('trust proxy', 1);

// ---------- CORS ----------
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
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
};

app.use(cors(corsOptions));

// ✅ Socket.io setup
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ✅ Socket.io authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                 socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    
    // Fetch username from database
    const user = await User.findById(decoded.userId).select('username');
    
    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.username = user?.username || 'Player';
    
    console.log(`🔌 Socket authenticated: ${socket.username} (${socket.userId})`);
    next();
  } catch (error) {
    console.error('❌ Socket auth error:', error.message);
    next(new Error('Invalid authentication token'));
  }
});

// ✅ Setup socket handlers from separate file
setupSocketHandlers(io);

// Make io available to other modules
app.set('io', io);

// ---------- Security Headers ----------
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// ---------- Parsers ----------
app.use(json());
app.use(urlencoded({ extended: true }));

// ---------- Routes ----------
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    auth: 'JWT',
    sockets: io.engine.clientsCount
  });
});

app.use('/api/uploads', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/questions', questionRouter);
app.use('/api/validation', validationRouter);
app.use('/api/admin', adminRouter);
app.use('/api/profile', profileRouter);
app.use('/api/users', userRouter);
app.use('/api/rooms', roomRouter);

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

// ---------- Start Server ----------
const PORT = Number(process.env.PORT || 8000);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Client Origin: ${CLIENT_ORIGIN}`);
  console.log(`🔐 Auth: JWT (No Sessions)`);
  console.log(`🔌 Socket.io ready`);
});
