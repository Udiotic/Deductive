// routers/adminRouter.js
import { Router } from 'express';
import { authenticateToken } from '../controllers/authController.js';
import { requireRole } from '../middlewares/authz.js';
import { listPending, approve, reject } from '../controllers/adminQuestionController.js';

const router = Router();

// ✅ Add JWT authentication + role authorization
router.get('/questions/pending', authenticateToken, requireRole('moderator','admin'), listPending);
router.post('/questions/:id/approve', authenticateToken, requireRole('moderator','admin'), approve);
router.post('/questions/:id/reject', authenticateToken, requireRole('moderator','admin'), reject);

export default router;
