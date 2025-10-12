// routers/questionRouter.js
import { Router } from 'express';
import { getRandomQuestion, getQuestionById, submitQuestion, adminUpdateQuestion, listMySubmissions } from '../controllers/questionController.js';
import { requireAuth, requireRole } from '../middlewares/authz.js';

const router = Router();

// public endpoints
router.get('/random', requireAuth, getRandomQuestion);
router.get('/mine', requireAuth, listMySubmissions);
router.get('/:id', requireAuth, getQuestionById);
router.post('/submit', requireAuth, submitQuestion);
router.patch('/:id', requireRole('admin'), adminUpdateQuestion);


export default router;
