// routers/adminRouter.js
import { Router } from 'express';
import { requireRole } from '../middlewares/authz.js';
import { listPending, approve, reject } from '../controllers/adminQuestionController.js';

const router = Router();

router.get('/questions/pending', requireRole('moderator','admin'), listPending);
router.post('/questions/:id/approve', requireRole('moderator','admin'), approve);
router.post('/questions/:id/reject', requireRole('moderator','admin'), reject);

export default router;
