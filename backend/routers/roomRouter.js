// routers/roomRouter.js - Updated without startGame
import { Router } from 'express';
import { authenticateToken } from '../controllers/authController.js';
import { 
  createRoom, 
  joinRoom, 
  getRoomState
} from '../controllers/roomController.js';

const router = Router();

// Room management routes
router.post('/create', authenticateToken, createRoom);
router.post('/join', authenticateToken, joinRoom);
router.get('/:code', authenticateToken, getRoomState);

// ✅ startGame is now handled by socket only - no REST route needed

export default router;
