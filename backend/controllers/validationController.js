// controllers/validationController.js - Updated with sophisticated prompt
import Groq from 'groq-sdk';

// Initialize Groq with error handling
let groq;
try {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  console.log('✅ Groq client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Groq client:', error.message);
}

/**
 * Deterministic fallback validation (same as frontend)
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

/**
 * Advanced LLM-based answer validation using sophisticated prompt
 */
export async function validateAnswerWithLLM(req, res) {
  try {
    const { 
      questionText, 
      canonicalAnswer, 
      userAnswer, 
      questionId,
      aliases = [],
      keyTokens = [],
      disallowedNearMisses = []
    } = req.body;
    
    console.log('🔍 LLM Validation request:', { 
      questionId, 
      userAnswer: userAnswer?.substring(0, 50) + '...',
      canonicalAnswer: canonicalAnswer?.substring(0, 50) + '...'
    });
    
    if (!questionText || !canonicalAnswer || !userAnswer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if Groq is available
    if (!groq || !process.env.GROQ_API_KEY) {
      console.log('⚠️ Groq not available, using deterministic validation');
      const result = validateAnswerDeterministic(userAnswer, canonicalAnswer);
      return res.json({
        verdict: result,
        confidence: 'deterministic',
        fallbackReason: 'Groq not initialized',
        explanation: 'Used deterministic validation due to LLM unavailability'
      });
    }

    // ✅ Create the sophisticated validation prompt
    const prompt = `SYSTEM
You are an answer validator for deduction-style quiz questions. Your job is to judge a free-text USER_ANSWER against the CANONICAL_ANSWER (and optional ALIASES/KEY_TOKENS/DISALLOWED). Be strict but fair: reward correct ideas even with typos or reordered words. Return ONLY a single JSON object exactly matching the schema below—no extra text.

INPUTS (will be interpolated)
QUESTION: ${questionText}
CANONICAL_ANSWER: ${canonicalAnswer}
ALIASES: ${JSON.stringify(aliases)}
KEY_TOKENS: ${JSON.stringify(keyTokens.length ? keyTokens : canonicalAnswer.toLowerCase().split(/\s+/).filter(word => word.length > 2))}
DISALLOWED_NEAR_MISSES: ${JSON.stringify(disallowedNearMisses)}
USER_ANSWER: ${userAnswer}

NORMALIZATION RULES
- Lowercase everything.
- Strip diacritics and punctuation; collapse whitespace.
- Remove stopwords: {the, a, an, of, in, and, to, for, on, at, by}.
- Tokenize on spaces for token checks.
- Treat ellipses (…) and "..." as spaces.

WHAT TO RETURN (JSON only)
{
  "verdict": "correct" | "hot" | "warm" | "cold",
  "normalized_answer": "<canonical or best alias, or '' if none>",
  "explanation": "<=120 chars: why you chose the verdict>"
}

VERDICT DEFINITIONS
- correct  → Semantically equivalent to the canonical/aliases. Accept:
  - Misspellings/typos: "ramnujan" ≈ "ramanujan".
  - Word-order permutations/minor function words: "area 51 storming" ≈ "storming of area 51".
  - Canonical concepts expressed with a known alias: "benzene ring" ≈ "structure of benzene" (if alias provided or obviously identical concept).
- hot      → Very close, but missing a specific essential qualifier or one critical token. Example: right meme but not its title; right franchise, wrong city.
- warm     → Partially right domain/some key tokens present, but not specific enough to uniquely identify the answer.
- cold     → Incorrect or matches a known near-miss; off-topic.

DISALLOWED NEAR-MISSES (hard rule)
- If USER_ANSWER exactly matches any DISALLOWED_NEAR_MISSES after normalization, verdict MUST be "cold".

RUBRIC (apply in this order)
1) Exact/alias match:
   - If normalized USER_ANSWER equals normalized CANONICAL_ANSWER or any ALIAS → "correct".
2) Typo acceptance:
   - If Damerau–Levenshtein style similarity to any acceptable answer (canonical or alias) is high
     AND token overlap is sufficient, mark "correct".
   - Heuristic thresholds (use internal reasoning but apply these outcomes):
     • short answers (<=10 chars): minor typos/transpositions acceptable.
     • long answers: allow small edit distance but ensure token overlap (see step 4).
3) Permutation acceptance:
   - If tokens match the same multiword set (ignoring stopwords/order), treat as "correct".
4) Token overlap gates (for near-misses):
   - Compute overlap between USER_ANSWER tokens and KEY_TOKENS (if provided), else canonical tokens.
   - If all critical tokens present but phrasing is off → "hot".
   - If ~half the critical tokens or clear domain but not unique → "warm".
5) Fallback:
   - Otherwise → "cold".

NORMALIZED_ANSWER FIELD
- If verdict is "correct", set normalized_answer to the CANONICAL_ANSWER (preferred) or the best matching alias.
- If not "correct", set normalized_answer to "".

EXPLANATION FIELD
- One short sentence (<=120 chars) that would help a player understand the decision, e.g.
  - "Accepted spelling of 'Disaster Girl'."
  - "Close: fictional Florida city needed (Vice City)."
  - "Too generic; domain right but missing title."

EDGE-CASE GUIDANCE
- Proper nouns: accept common misspellings if unambiguous.
- Singular/plural/tense/casing differences do not matter.
- Years/numbers: accept ±1 when the question suggests approximation; otherwise require exact.
- Multi-part answers: require all essential parts; if one missing → "hot".
- If USER_ANSWER merely says a hypernym ("a meme", "a chemistry ring"), that is "warm" or "cold" depending on specificity.
- If USER_ANSWER contains both a correct and an incorrect entity, prefer the dominant intent; if ambiguous → "warm".

STRICT OUTPUT
- Output ONLY the JSON object. No prose before/after.
- verdict MUST be lowercase.
- If unsure between two categories, choose the more conservative one (e.g., warm vs hot).`;

    console.log('🤖 Starting LLM validation for question:', questionId);
    const start = Date.now();

    // Use Groq for ultra-fast inference
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 200, // ✅ More tokens for JSON response
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    const duration = Date.now() - start;
    
    console.log(`✅ LLM raw response (${duration}ms):`, response);

    try {
      // ✅ Parse JSON response
      const parsed = JSON.parse(response);
      
      // Validate the response structure
      if (!parsed.verdict || !['correct', 'hot', 'warm', 'cold'].includes(parsed.verdict)) {
        throw new Error('Invalid verdict in LLM response');
      }

      console.log(`✅ LLM validation complete: ${parsed.verdict} - ${parsed.explanation}`);

      return res.json({
        verdict: parsed.verdict,
        normalizedAnswer: parsed.normalized_answer || '',
        explanation: parsed.explanation || '',
        confidence: 'llm',
        duration,
        tokens: completion.usage?.total_tokens || 0
      });

    } catch (parseError) {
      console.error('❌ Failed to parse LLM JSON response:', parseError.message);
      console.error('Raw response was:', response);
      
      // Fallback: try to extract verdict from text
      const fallbackVerdict = response?.toLowerCase().includes('correct') ? 'correct' :
                             response?.toLowerCase().includes('hot') ? 'hot' :
                             response?.toLowerCase().includes('warm') ? 'warm' : 'cold';
      
      return res.json({
        verdict: fallbackVerdict,
        normalizedAnswer: '',
        explanation: 'LLM response parsing failed',
        confidence: 'llm-fallback',
        duration,
        error: 'JSON parsing failed'
      });
    }

  } catch (error) {
    console.error('❌ LLM validation error:', error.message);
    
    // Fallback to deterministic validation
    const deterministicResult = validateAnswerDeterministic(req.body.userAnswer, req.body.canonicalAnswer);
    
    return res.json({
      verdict: deterministicResult,
      confidence: 'fallback',
      error: 'LLM validation failed',
      errorMessage: error.message,
      explanation: 'Used deterministic fallback due to LLM error'
    });
  }
}
