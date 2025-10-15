// routers/validationRouter.js - New file
import { Router } from 'express';
import { validateAnswerWithLLM } from '../controllers/validationController.js';
import { authenticateToken } from '../controllers/authController.js';

const router = Router();

router.post('/answer', authenticateToken, validateAnswerWithLLM);

export default router;
