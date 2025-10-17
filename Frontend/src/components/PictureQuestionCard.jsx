// src/components/PictureQuestionCard.jsx - Enhanced card for visual questions
import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../lib/api';
import { 
  Camera,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Send,
  Target,
  Zap,
  Flame,
  Flag,
  User,
  Edit3,
  ChevronRight,
  Eye
} from 'lucide-react';

// Use the same validation logic
function validateAnswer(userAnswer, correctAnswer) {
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
      (token.length > 3 && userToken.includes(token)) || 
      levenshteinDistance(userToken, token) <= 1
    )
  );
  
  const matchRatio = matchingTokens.length / keyTokens.length;
  
  if (matchRatio >= 0.8) return 'hot';
  if (matchRatio >= 0.4) return 'warm';
  return 'cold';
}

function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

export default function PictureQuestionCard({ 
  question, 
  onNextQuestion,
  onShowToast,
  onScoreUpdate,
  onEditQuestion,
  user,
  mode = "picture-mode"
}) {
  // Local state
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    if (question) {
      console.log('🖼️ New visual question loaded, resetting state:', question.id);
      setUserAnswer('');
      setFeedback(null);
      setAttempts(0);
      setGaveUp(false);
      setReveal(null);
      setLoading(false);
      setShowCelebration(false);
    }
  }, [question?.id]);

  // Handle answer submission (same logic as regular card)
  const handleSubmitAnswer = useCallback(async () => {
    if (!question || !userAnswer.trim() || gaveUp) return;
    
    try {
      setLoading(true);
      
      let answerData = reveal;
      if (!answerData) {
        const full = await get(`/api/questions/${question.id}?reveal=true`);
        answerData = {
          answer: full.answer,
          answerImage: full.answerImage,
          answerOneLiner: full.answerOneLiner,
        };
        setReveal(answerData);
      }

      let result = validateAnswer(userAnswer, answerData.answer);
      let validationMethod = 'deterministic';
      
      if (result !== 'correct') {
        try {
          const llmResponse = await fetch(`${import.meta.env.VITE_API_BASE}/api/validation/answer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: JSON.stringify({
              questionText: question.body,
              canonicalAnswer: answerData.answer,
              userAnswer: userAnswer,
              questionId: question.id,
              aliases: [],
              keyTokens: [],
              disallowedNearMisses: []
            })
          });
          
          if (llmResponse.ok) {
            const llmData = await llmResponse.json();
            if (llmData.verdict && llmData.verdict !== result) {
              result = llmData.verdict;
              validationMethod = 'llm';
            }
          }
        } catch (llmError) {
          console.log('⚠️ LLM validation error:', llmError.message);
        }
      }
      
      setFeedback(result);
      setAttempts(prev => prev + 1);
      
      if (result === 'correct') {
        const basePoints = 100;
        const attemptPenalty = Math.min(50, (attempts) * 10);
        const points = Math.max(20, basePoints - attemptPenalty);
        onScoreUpdate?.(points);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
      
      if (validationMethod === 'llm') {
        onShowToast?.('🧠 AI found a better match!');
      } else if (validationMethod === 'deterministic') {
        onShowToast?.('⚡ Lightning-fast validation');
      }
      
    } catch (error) {
      console.error('Failed to validate answer:', error);
      onShowToast?.('Failed to check answer. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [question, userAnswer, reveal, attempts, gaveUp, onScoreUpdate, onShowToast]);

  const handleGiveUp = useCallback(async () => {
    if (!question || gaveUp) return;
    
    try {
      setLoading(true);
      
      if (!reveal) {
        const full = await get(`/api/questions/${question.id}?reveal=true`);
        setReveal({
          answer: full.answer,
          answerImage: full.answerImage,
          answerOneLiner: full.answerOneLiner,
        });
      }
      
      setGaveUp(true);
      setFeedback(null);
      onShowToast?.('No worries! Visual puzzles can be tricky 🖼️');
      
    } catch (error) {
      console.error('Failed to fetch answer:', error);
      onShowToast?.('Failed to load answer. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [question, reveal, gaveUp, onShowToast]);

  // Get feedback styling (emerald theme for picture mode)
  const getFeedbackStyle = (feedbackType) => {
    switch (feedbackType) {
      case 'correct':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'hot':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warm':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cold':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFeedbackIcon = (feedbackType) => {
    switch (feedbackType) {
      case 'correct':
        return <CheckCircle size={20} />;
      case 'hot':
        return <Flame size={20} />;
      case 'warm':
        return <Zap size={20} />;
      case 'cold':
        return <Target size={20} />;
      default:
        return null;
    }
  };

  if (!question) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-12">
        <div className="text-center">
          <Camera size={32} className="text-emerald-500 mx-auto mb-4" />
          <div className="text-xl text-gray-600">No visual question available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div className="animate-bounce">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl">
              <Camera size={24} className="text-white" />
            </div>
          </div>
        </div>
      )}

      <div className="p-8 lg:p-12">
        {/* Question Header - Picture Mode themed */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
            <Camera size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Visual Challenge</h2>
            <p className="text-gray-500 text-sm">Look carefully and analyze what you see</p>
          </div>
        </div>

        {/* Question Content */}
        <div className="prose prose-lg max-w-none mb-8">
          <div className="text-xl leading-relaxed text-gray-800 whitespace-pre-wrap font-medium">
            {question.body}
          </div>
        </div>

        {/* ✅ Enhanced Image Display for Picture Mode */}
        {question.images?.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={20} className="text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Study the Image{question.images.length > 1 ? 's' : ''}</h3>
            </div>
            <div className={`grid gap-6 ${question.images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {question.images.map((im, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl bg-gray-100">
                  <img 
                    src={im.url} 
                    alt={im.alt || `Visual clue ${i + 1}`} 
                    className="w-full h-auto rounded-2xl shadow-lg group-hover:scale-[1.02] transition-transform duration-500" 
                    style={{ minHeight: '200px', maxHeight: '500px', objectFit: 'contain' }}
                  />
                  {im.alt && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      {im.alt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer Input Section */}
        {!gaveUp && feedback !== 'correct' && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Send size={20} className="text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Your Answer</h3>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="What do you see? Type your answer here..."
                className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitAnswer();
                  }
                }}
              />
              
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={loading || !userAnswer.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 transition-all"
                >
                  {loading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  <span>{loading ? 'Checking...' : 'Submit Answer'}</span>
                </button>
                
                <button
                  onClick={handleGiveUp}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 border border-emerald-300 text-emerald-700 rounded-xl font-medium hover:bg-emerald-50 hover:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Flag size={18} />
                  <span>Can't See It?</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Display */}
        {feedback && !gaveUp && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${getFeedbackStyle(feedback)}`}>
            {getFeedbackIcon(feedback)}
            <div className="flex-1">
              <div className="font-semibold capitalize">{feedback}!</div>
              <div className="text-sm">
                {feedback === 'correct' && `Perfect observation! +${Math.max(20, 100 - (attempts * 10))} points`}
                {feedback === 'hot' && 'Very close! Look more carefully at the details.'}
                {feedback === 'warm' && 'Getting warmer. Focus on the key visual elements.'}
                {feedback === 'cold' && 'Not quite right. Take another look at the image.'}
              </div>
            </div>
            <div className="text-sm font-medium">
              Attempt {attempts}
            </div>
          </div>
        )}

        {/* Show answer after correct or giving up */}
        {(feedback === 'correct' || gaveUp) && reveal && (
          <div className="animate-in slide-in-from-bottom duration-500 border-t border-gray-100 pt-8">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
              <div className="flex items-center gap-2 mb-4">
                {feedback === 'correct' ? (
                  <>
                    <CheckCircle size={24} className="text-emerald-600" />
                    <span className="text-lg font-bold text-emerald-800">Great eye! You got it!</span>
                  </>
                ) : (
                  <>
                    <Camera size={24} className="text-emerald-600" />
                    <span className="text-lg font-bold text-emerald-800">Here's what to look for:</span>
                  </>
                )}
              </div>

              {reveal.answerOneLiner && (
                <div className="mb-4 text-emerald-700 italic">
                  "{reveal.answerOneLiner}"
                </div>
              )}
              
              <div className="mb-4">
                <div className="text-lg text-gray-800 leading-relaxed font-medium">
                  {reveal.answer}
                </div>
              </div>

              {reveal.answerImage?.url && (
                <div className="mt-6">
                  <div className="text-sm text-emerald-700 font-medium mb-2">Explanation Image:</div>
                  <img
                    src={reveal.answerImage.url}
                    alt={reveal.answerImage.alt || 'Answer explanation'}
                    className="rounded-2xl shadow-lg max-w-full h-auto"
                  />
                </div>
              )}
            </div>

            {/* Next Question Button */}
            <div className="mt-6 text-center">
              <button
                onClick={onNextQuestion}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-semibold hover:scale-105 transition-all duration-200"
              >
                <span>Next Visual Challenge</span>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Admin Edit Button */}
        {String(user?.role || '').toLowerCase() === 'admin' && (
          <div className="border-t border-gray-100 pt-6 mt-6">
            <button
              onClick={() => onEditQuestion?.(question)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
            >
              <Edit3 size={18} />
              <span>Edit Visual Question</span>
            </button>
          </div>
        )}

        {/* Question Attribution */}
        <div className="border-t border-gray-100 pt-6 mt-6">
          <div className="flex items-center gap-2 text-gray-500">
            <User size={16} />
            <span className="text-sm">
              Submitted by{' '}
              {question.submittedBy?.username ? (
                <Link
                  to={`/profile/${question.submittedBy.username}`}
                  className="font-medium text-emerald-600 hover:text-emerald-800 hover:underline transition-colors"
                >
                  @{question.submittedBy.username}
                </Link>
              ) : (
                <span className="font-medium text-gray-700">@Unknown</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
