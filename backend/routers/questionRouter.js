// routers/questionRouter.js - ✅ CORRECT ORDER
import { Router } from 'express';
import { getRandomQuestion, getQuestionById, submitQuestion, adminUpdateQuestion, listMySubmissions } from '../controllers/questionController.js';
import { authenticateToken } from '../controllers/authController.js'; 
import { requireRole } from '../middlewares/authz.js'; 

const router = Router();

// ✅ Specific routes FIRST
router.get('/random', getRandomQuestion);      
router.get('/mine', authenticateToken, listMySubmissions); // ✅ Move this UP
router.post('/submit', authenticateToken, submitQuestion);      

// ✅ Generic/parameterized routes LAST  
router.get('/:id', getQuestionById);           // ✅ Move this DOWN

// ✅ Admin endpoints
router.patch('/:id', 
  authenticateToken,           
  requireRole('admin'),        
  adminUpdateQuestion
);

export default router;
