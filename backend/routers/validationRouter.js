// routers/validationRouter.js
import { Router } from 'express';
import { validateAnswerWithLLM } from '../controllers/validationController.js';
import { authenticateToken } from '../controllers/authController.js';

const router = Router();

// ✅ Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Validation API is working!',
    groqAvailable: !!process.env.GROQ_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// ✅ Answer validation endpoint
router.post('/answer', authenticateToken, validateAnswerWithLLM);

export default router;
