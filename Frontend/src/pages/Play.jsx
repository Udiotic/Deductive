// src/pages/Play.jsx - Updated with "Stumped?" give up option
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patch, get } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import QuillEditor from '../components/QuillEditor';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  User, 
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Send,
  Target,
  Zap,
  Trophy,
  Flame,
  Flag
} from 'lucide-react';

/**
 * Deterministic answer validation with typo tolerance and alias matching
 * Returns: 'correct', 'hot', 'warm', 'cold'
 */
function validateAnswer(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return 'cold';
  
  const normalize = (text) => text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const userNorm = normalize(userAnswer);
  const correctNorm = normalize(correctAnswer);
  
  // Exact match
  if (userNorm === correctNorm) return 'correct';
  
  // Extract key tokens from correct answer (words longer than 2 chars)
  const keyTokens = correctNorm.split(/\s+/).filter(word => word.length > 2);
  const userTokens = userNorm.split(/\s+/);
  
  // Count matching key tokens
  const matchingTokens = keyTokens.filter(token => 
    userTokens.some(userToken => 
      userToken === token || // exact match
      (userToken.length > 3 && token.includes(userToken)) || // partial match
      (token.length > 3 && userToken.includes(token)) || // reverse partial
      levenshteinDistance(userToken, token) <= 1 // typo tolerance
    )
  );
  
  const matchRatio = matchingTokens.length / keyTokens.length;
  
  // Feedback based on match ratio
  if (matchRatio >= 0.8) return 'hot';
  if (matchRatio >= 0.4) return 'warm';
  return 'cold';
}

/**
 * Simple Levenshtein distance for typo tolerance
 */
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

export default function Play() {
  const { user } = useAuth();

  // Game state
  const [stack, setStack] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const current = idx >= 0 ? stack[idx] : null;

  // ✅ Input & validation state (removed hint-related state)
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct', 'hot', 'warm', 'cold'
  const [attempts, setAttempts] = useState(0);
  const [gaveUp, setGaveUp] = useState(false); // ✅ Track if user gave up
  const [score, setScore] = useState(() => {
    const saved = localStorage.getItem('casual-solo-score');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Admin edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editBodyHtml, setEditBodyHtml] = useState('');
  const [editAnswerHtml, setEditAnswerHtml] = useState('');
  const [editOneLiner, setEditOneLiner] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Save score to localStorage
  useEffect(() => {
    localStorage.setItem('casual-solo-score', score.toString());
  }, [score]);

  // ✅ Reset question-specific state when question changes
  useEffect(() => {
    if (current) {
      setUserAnswer('');
      setFeedback(null);
      setAttempts(0);
      setGaveUp(false); // ✅ Reset gave up state
      setReveal(null);
    }
  }, [current?.id]);

  // Fetch random question
  const fetchRandom = useCallback(async () => {
    setLoading(true);
    try {
      const lastIds = stack.slice(-10).map(q => q.id);
      const excludeIds = Array.from(new Set(lastIds));
      const query = excludeIds.length
        ? '?' + new URLSearchParams(excludeIds.map(id => ['excludeIds', id]))
        : '';

      const q = await get('/api/questions/random' + query);
      setStack(prev => [...prev.slice(0, idx + 1), q]);
      setIdx(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [stack, idx]);

  // Handle answer submission
  const handleSubmitAnswer = useCallback(async () => {
    if (!current || !userAnswer.trim() || gaveUp) return;
    
    // Get correct answer if we don't have it
    if (!reveal) {
      try {
        setLoading(true);
        const full = await get(`/api/questions/${current.id}?reveal=true`);
        setReveal({
          answer: full.answer,
          answerImage: full.answerImage,
          answerOneLiner: full.answerOneLiner,
        });
        
        // Validate against the fetched answer
        const result = validateAnswer(userAnswer, full.answer);
        setFeedback(result);
        setAttempts(prev => prev + 1);
        
        // ✅ Award points (simplified - no hint penalties)
        if (result === 'correct') {
          const basePoints = 100;
          const attemptPenalty = Math.min(50, (attempts) * 10); // -10 points per attempt, max -50
          const points = Math.max(20, basePoints - attemptPenalty); // Min 20 points
          setScore(prev => prev + points);
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
        
      } catch (error) {
        console.error('Failed to fetch answer:', error);
        setToast('Failed to check answer. Please try again.');
        setTimeout(() => setToast(''), 3000);
      } finally {
        setLoading(false);
      }
    } else {
      // We already have the answer
      const result = validateAnswer(userAnswer, reveal.answer);
      setFeedback(result);
      setAttempts(prev => prev + 1);
      
      if (result === 'correct') {
        const basePoints = 100;
        const attemptPenalty = Math.min(50, (attempts) * 10);
        const points = Math.max(20, basePoints - attemptPenalty);
        setScore(prev => prev + points);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    }
  }, [current, userAnswer, reveal, attempts, gaveUp]);

  // ✅ Handle giving up - reveals the answer
  const handleGiveUp = useCallback(async () => {
    if (!current || gaveUp) return;
    
    try {
      setLoading(true);
      
      // Get the answer if we don't have it
      if (!reveal) {
        const full = await get(`/api/questions/${current.id}?reveal=true`);
        setReveal({
          answer: full.answer,
          answerImage: full.answerImage,
          answerOneLiner: full.answerOneLiner,
        });
      }
      
      setGaveUp(true);
      setFeedback(null); // Clear any previous feedback
      setToast('No worries! Sometimes the best puzzles are the trickiest ones 🧩');
      setTimeout(() => setToast(''), 4000);
      
    } catch (error) {
      console.error('Failed to fetch answer:', error);
      setToast('Failed to load answer. Please try again.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  }, [current, reveal, gaveUp]);

  // Get feedback styling
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

  // Get feedback icon
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

  useEffect(() => {
    fetchRandom();
  }, []);

  const goBack = () => {
    setIdx(i => Math.max(0, i - 1));
  };

  const goNext = () => {
    setShowCelebration(false);
    if (idx < stack.length - 1) {
      setIdx(i => i + 1);
    } else {
      fetchRandom();
    }
  };

  // Admin functions
  function openEdit() {
    if (!current) return;
    const toHtml = (plain) =>
      plain ? `<p>${String(plain).replace(/\n/g, '</p><p>')}</p>` : '<p></p>';

    setEditBodyHtml(toHtml(current.body));
    setEditAnswerHtml(toHtml(reveal?.answer || ''));
    setEditOneLiner(reveal?.answerOneLiner || '');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!current) return;
    try {
      setSaving(true);
      await patch(`/api/questions/${current.id}`, {
        bodyHtml: editBodyHtml,
        answerHtml: editAnswerHtml,
        answerOneLiner: editOneLiner,
      });
      
      setEditOpen(false);
      setToast('Changes saved successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!current && loading) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your next challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Score Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={loading || idx <= 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              <span className="font-medium">Previous</span>
            </button>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">Question {Math.max(0, idx) + 1}</div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Trophy size={16} />
                  <span>Score: {score}</span>
                </div>
                <div className="text-gray-400">•</div>
                <div>Casual Solo Mode</div>
              </div>
            </div>

            <button
              onClick={goNext}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-medium">{loading ? 'Loading...' : 'Next'}</span>
              {loading ? <RefreshCw size={20} className="animate-spin" /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 max-w-sm">
            <CheckCircle size={20} />
            <span className="font-medium text-sm">{toast}</span>
          </div>
        </div>
      )}

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
          <div className="animate-bounce">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
              <Sparkles size={32} className="text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {current ? (
          <div className="space-y-8">
            {/* Question Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="p-8 lg:p-12">
                {/* Question Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Lightbulb size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-indigo-600 uppercase tracking-wider">Deductive Challenge</h2>
                    <p className="text-gray-500 text-sm">Think carefully and use logic</p>
                  </div>
                </div>

                {/* Question Content */}
                <div className="prose prose-lg max-w-none mb-8">
                  <div className="text-xl leading-relaxed text-gray-800 whitespace-pre-wrap font-medium">
                    {current.body}
                  </div>
                </div>

                {/* Question Images */}
                {current.images?.length > 0 && (
                  <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {current.images.map((im, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-2xl">
                        <img 
                          src={im.url} 
                          alt={im.alt || ''} 
                          className="w-full h-auto rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* ✅ Answer Input Section - only show if not given up and not correct */}
                {!gaveUp && feedback !== 'correct' && (
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Send size={20} className="text-indigo-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Your Answer</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 transition-all"
                        >
                          {loading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                          <span>{loading ? 'Checking...' : 'Submit Answer'}</span>
                        </button>
                        
                        {/* ✅ Give Up Button */}
                        <button
                          onClick={handleGiveUp}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Flag size={18} />
                          <span>Stumped?</span>
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
                        {feedback === 'correct' && `Perfect! +${Math.max(20, 100 - (attempts * 10))} points`}
                        {feedback === 'hot' && 'Very close! Try refining your answer.'}
                        {feedback === 'warm' && 'Getting warmer. Think about the key details.'}
                        {feedback === 'cold' && 'Not quite right. Consider other possibilities.'}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      Attempt {attempts}
                    </div>
                  </div>
                )}

                {/* ✅ Show answer after correct or giving up */}
                {(feedback === 'correct' || gaveUp) && reveal && (
                  <div className="animate-in slide-in-from-bottom duration-500 border-t border-gray-100 pt-8">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                      {/* ✅ Different header for giving up vs getting it right */}
                      <div className="flex items-center gap-2 mb-4">
                        {feedback === 'correct' ? (
                          <>
                            <CheckCircle size={24} className="text-emerald-600" />
                            <span className="text-lg font-bold text-emerald-800">Brilliant! You got it!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={24} className="text-indigo-600" />
                            <span className="text-lg font-bold text-indigo-800">No worries! Here's the answer:</span>
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
                          <img
                            src={reveal.answerImage.url}
                            alt={reveal.answerImage.alt || ''}
                            className="rounded-2xl shadow-lg max-w-full h-auto"
                          />
                        </div>
                      )}
                    </div>

                    {/* Next Question Prompt */}
                    <div className="mt-6 text-center">
                      <button
                        onClick={goNext}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:scale-105 transition-all duration-200"
                      >
                        <span>Next Challenge</span>
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin Edit Button */}
                {String(user?.role || '').toLowerCase() === 'admin' && (
                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <button
                      onClick={openEdit}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <Edit3 size={18} />
                      <span>Edit Question</span>
                    </button>
                  </div>
                )}

                {/* Question Attribution */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <div className="flex items-center gap-2 text-gray-500">
                    <User size={16} />
                    <span className="text-sm">
                      Submitted by{' '}
                      {current.submittedBy?.username ? (
                        <Link
                          to={`/profile/${current.submittedBy.username}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                        >
                          @{current.submittedBy.username}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-700">@Unknown</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-xl text-gray-600">No questions available right now</div>
            <button
              onClick={fetchRandom}
              className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Admin Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Edit Question</h3>
              <p className="text-gray-500 text-sm">Make changes to improve this question</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Content</label>
                <QuillEditor
                  value={editBodyHtml}
                  onChange={setEditBodyHtml}
                  placeholder="Enter the question..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Content</label>
                <QuillEditor
                  value={editAnswerHtml}
                  onChange={setEditAnswerHtml}
                  placeholder="Enter the answer..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">One-liner Summary</label>
                <input
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={editOneLiner}
                  onChange={(e) => setEditOneLiner(e.target.value)}
                  placeholder="Brief explanation or hint..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-gray-100">
              <button
                onClick={() => setEditOpen(false)}
                className="px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
