// src/pages/Play.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRandomQuestionQuery, useQuestionQuery } from '../hooks/useQueries';
import { patch, get } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import QuillEditor from '../components/QuillEditor';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Edit3, 
  User, 
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function Play() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ✅ Game state
  const [questionHistory, setQuestionHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // ✅ Admin edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editBodyHtml, setEditBodyHtml] = useState('');
  const [editAnswerHtml, setEditAnswerHtml] = useState('');
  const [editOneLiner, setEditOneLiner] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // ✅ Get current question ID and exclude list
  const currentQuestionId = currentIndex >= 0 ? questionHistory[currentIndex] : null;
  const excludeIds = questionHistory.slice(-10); // Last 10 questions

  // ✅ Fetch random question with React Query
  const { 
    data: randomQuestion, 
    isLoading: loadingRandom,
    refetch: fetchNewQuestion 
  } = useRandomQuestionQuery(excludeIds);

  // ✅ Fetch current question details
  const { 
    data: currentQuestion, 
    isLoading: loadingCurrent 
  } = useQuestionQuery(currentQuestionId);

  // ✅ Fetch full question with answer when revealing
  const { 
    data: fullQuestion, 
    isLoading: loadingAnswer,
    refetch: fetchFullQuestion 
  } = useQuestionQuery(currentQuestionId, { reveal: showAnswer });

  // ✅ Initialize with first question
  const initializeGame = () => {
    if (randomQuestion && currentIndex === -1) {
      setQuestionHistory([randomQuestion.id]);
      setCurrentIndex(0);
      // Prefetch the full version for answer reveal
      queryClient.prefetchQuery({
        queryKey: ['question', randomQuestion.id, 'full'],
        queryFn: () => get(`/api/questions/${randomQuestion.id}?reveal=true`),
      });
    }
  };

  // Initialize when random question loads
  useMemo(() => {
    initializeGame();
  }, [randomQuestion]);

  // ✅ Navigation functions
  const goNext = () => {
    setShowAnswer(false);
    setShowCelebration(false);
    
    if (currentIndex < questionHistory.length - 1) {
      // Go to next question in history
      setCurrentIndex(currentIndex + 1);
    } else {
      // Fetch new question
      if (randomQuestion) {
        setQuestionHistory(prev => [...prev, randomQuestion.id]);
        setCurrentIndex(prev => prev + 1);
        // Refetch for next question
        fetchNewQuestion();
        // Prefetch the full version
        queryClient.prefetchQuery({
          queryKey: ['question', randomQuestion.id, 'full'],
          queryFn: () => get(`/api/questions/${randomQuestion.id}?reveal=true`),
        });
      }
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
      setShowCelebration(false);
    }
  };

  // ✅ Answer reveal
  const toggleAnswer = () => {
    if (!currentQuestion) return;
    
    if (showAnswer) {
      setShowAnswer(false);
      setShowCelebration(false);
    } else {
      setShowAnswer(true);
      // Show celebration animation
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
  };

  // ✅ Admin edit functions (unchanged logic)
  const openEdit = () => {
    if (!currentQuestion) return;
    const toHtml = (plain) =>
      plain ? `<p>${String(plain).replace(/\n/g, '</p><p>')}</p>` : '<p></p>';

    setEditBodyHtml(toHtml(currentQuestion.body));
    setEditAnswerHtml(toHtml(fullQuestion?.answer || ''));
    setEditOneLiner(fullQuestion?.answerOneLiner || '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!currentQuestion) return;
    try {
      setSaving(true);
      await patch(`/api/questions/${currentQuestion.id}`, {
        bodyHtml: editBodyHtml,
        answerHtml: editAnswerHtml,
        answerOneLiner: editOneLiner,
      });
      setEditOpen(false);
      setShowAnswer(false);
      setToast('Changes saved successfully!');

      // Invalidate and refetch question data
      queryClient.invalidateQueries({ queryKey: ['question', currentQuestion.id] });
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ✅ Loading state
  if (currentIndex === -1 && loadingRandom) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your next challenge...</p>
        </div>
      </div>
    );
  }

  // ✅ Get display data - use full question if showing answer, otherwise basic
  const displayQuestion = showAnswer ? fullQuestion || currentQuestion : currentQuestion;
  const isLoading = loadingCurrent || (showAnswer && loadingAnswer);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header with Progress */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={currentIndex <= 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              <span className="font-medium">Previous</span>
            </button>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">Question {currentIndex + 1}</div>
              <div className="text-sm text-gray-500">Keep that brain working!</div>
            </div>

            <button
              onClick={goNext}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-medium">{isLoading ? 'Loading...' : 'Next'}</span>
              {isLoading ? <RefreshCw size={20} className="animate-spin" /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2">
            <CheckCircle size={20} />
            <span className="font-medium">{toast}</span>
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
        {displayQuestion ? (
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
                    {displayQuestion.body}
                  </div>
                </div>

                {/* Question Images */}
                {displayQuestion.images?.length > 0 && (
                  <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayQuestion.images.map((im, i) => (
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

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <button
                    onClick={toggleAnswer}
                    disabled={isLoading}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                      showAnswer 
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <RefreshCw size={24} className="animate-spin" />
                    ) : showAnswer ? (
                      <EyeOff size={24} />
                    ) : (
                      <Eye size={24} />
                    )}
                    <span>
                      {isLoading ? 'Loading...' : showAnswer ? 'Hide Answer' : 'Reveal Answer'}
                    </span>
                  </button>

                  {/* Admin Edit Button */}
                  {String(user?.role || '').toLowerCase() === 'admin' && (
                    <button
                      onClick={openEdit}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <Edit3 size={18} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {/* Answer Reveal */}
                {showAnswer && fullQuestion && (
                  <div className="animate-in slide-in-from-bottom duration-500 border-t border-gray-100 pt-8">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                      {fullQuestion.answerOneLiner && (
                        <div className="flex items-center gap-2 mb-4 text-emerald-700">
                          <CheckCircle size={20} />
                          <span className="text-lg font-medium italic">{fullQuestion.answerOneLiner}</span>
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Sparkles size={24} className="text-emerald-600" />
                          The Answer
                        </h3>
                        <div className="text-lg text-gray-800 leading-relaxed">
                          {fullQuestion.answer}
                        </div>
                      </div>

                      {fullQuestion.answerImage?.url && (
                        <div className="mt-6">
                          <img
                            src={fullQuestion.answerImage.url}
                            alt={fullQuestion.answerImage.alt || ''}
                            className="rounded-2xl shadow-lg max-w-full h-auto"
                          />
                        </div>
                      )}
                    </div>

                    {/* Next Question Prompt */}
                    <div className="mt-6 text-center">
                      <button
                        onClick={goNext}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:scale-105 transition-all duration-200"
                      >
                        <span>Next Challenge</span>
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Question Attribution */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <div className="flex items-center gap-2 text-gray-500">
                    <User size={16} />
                    <span className="text-sm">
                      Submitted by{' '}
                      {displayQuestion.submittedBy?.username ? (
                        <Link
                          to={`/profile/${displayQuestion.submittedBy.username}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                        >
                          @{displayQuestion.submittedBy.username}
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
              onClick={() => fetchNewQuestion()}
              className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Admin Edit Modal - unchanged */}
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
