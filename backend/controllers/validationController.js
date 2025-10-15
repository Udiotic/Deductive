// controllers/validationController.js - New file
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Fast LLM-based answer validation using Groq
 */
export async function validateAnswerWithLLM(req, res) {
  try {
    const { questionText, correctAnswer, userAnswer, questionId } = req.body;
    
    if (!questionText || !correctAnswer || !userAnswer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create a focused prompt for validation
    const prompt = `You are validating answers to deductive puzzles. Compare the user's answer to the correct answer and determine if they are semantically equivalent, even if worded differently.

Question: ${questionText}

Correct Answer: ${correctAnswer}
User Answer: ${userAnswer}

Are these answers equivalent in meaning? Consider:
- Synonyms and alternate phrasings
- Key concepts and ideas
- Partial credit for close answers

Respond with exactly one word: CORRECT, HOT, WARM, or COLD

CORRECT = Semantically equivalent, different wording OK
HOT = Very close, minor details missing or slightly off
WARM = Partially correct, some key elements present
COLD = Incorrect or completely off-topic`;

    console.log('🤖 LLM validation for question:', questionId);
    const start = Date.now();

    // Use Groq for ultra-fast inference
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant', // Ultra-fast model
      temperature: 0.1, // Low temperature for consistent validation
      max_tokens: 10, // We only need one word
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content?.trim().toUpperCase();
    const duration = Date.now() - start;
    
    console.log(`✅ LLM response: ${response} (${duration}ms)`);

    // Validate response and normalize
    const validResponses = ['CORRECT', 'HOT', 'WARM', 'COLD'];
    const result = validResponses.includes(response) ? response.toLowerCase() : 'cold';

    return res.json({
      result,
      confidence: 'llm',
      duration,
      tokens: completion.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('❌ LLM validation error:', error);
    
    // Fallback to deterministic validation on LLM failure
    const deterministicResult = validateAnswerDeterministic(req.body.userAnswer, req.body.correctAnswer);
    
    return res.json({
      result: deterministicResult,
      confidence: 'fallback',
      error: 'LLM validation failed'
    });
  }
}

/**
 * Deterministic fallback (same logic as frontend)
 */
function validateAnswerDeterministic(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return 'cold';
  
  const normalize = (text) => text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const userNorm = normalize(userAnswer);
  const correctNorm = normalize(correctAnswer);
  
  if (userNorm === correctNorm) return 'correct';
  
  const keyTokens = correctNorm.split(/\s+/).filter(word => word.length > 2);
  const userTokens = userNorm.split(/\s+/);
  
  const matchingTokens = keyTokens.filter(token => 
    userTokens.some(userToken => 
      userToken === token || 
      (userToken.length > 3 && token.includes(userToken)) ||
      (token.length > 3 && userToken.includes(token))
    )
  );
  
  const matchRatio = matchingTokens.length / keyTokens.length;
  
  if (matchRatio >= 0.8) return 'hot';
  if (matchRatio >= 0.4) return 'warm';
  return 'cold';
}
