// src/pages/Play.jsx - Back to basics, but with proper caching
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRandomQuestionQuery, useQuestionQuery } from '../hooks/useQueries';
import { patch } from '../lib/api';
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

  // ✅ Simple state - back to your original approach
  const [stack, setStack] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const current = idx >= 0 ? stack[idx] : null;

  // ✅ Admin edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editBodyHtml, setEditBodyHtml] = useState('');
  const [editAnswerHtml, setEditAnswerHtml] = useState('');
  const [editOneLiner, setEditOneLiner] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // ✅ Simple question fetching - only when we need new ones
  const fetchRandom = useCallback(async () => {
    setLoading(true);
    setReveal(null);
    
    try {
      // Use the query client to fetch and cache
      const lastIds = stack.slice(-10).map(q => q.id);
      const excludeIds = Array.from(new Set(lastIds));
      
      // ✅ Create a simple cache key based on excluded IDs
      const cacheKey = ['question', 'random', excludeIds.sort().join(',')];
      
      // ✅ Try to get from cache first
      let q = queryClient.getQueryData(cacheKey);
      
      if (!q) {
        // ✅ Not in cache, fetch from API
        console.log('🌐 API CALL: Fetching random question');
        const query = excludeIds.length
          ? '?' + new URLSearchParams(excludeIds.map(id => ['excludeIds', id]))
          : '';
        
        const response = await fetch(`/api/questions/random${query}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        
        if (!response.ok) throw new Error('Failed to fetch question');
        q = await response.json();
        
        // ✅ Cache the result
        queryClient.setQueryData(cacheKey, q, {
          staleTime: 5 * 60 * 1000, // 5 minutes
        });
      } else {
        console.log('🚀 Using cached question');
      }

      setStack(prev => [...prev.slice(0, idx + 1), q]);
      setIdx(prev => prev + 1);
    } catch (error) {
      console.error('Failed to fetch question:', error);
    } finally {
      setLoading(false);
    }
  }, [stack, idx, queryClient]);

  // ✅ Answer reveal with caching
  async function toggleAnswer() {
    if (!current) return;
    if (reveal) { 
      setReveal(null); 
      setShowCelebration(false);
      return; 
    }
    
    setLoading(true);
    try {
      // ✅ Try cache first
      const cacheKey = ['question', current.id, 'full'];
      let full = queryClient.getQueryData(cacheKey);
      
      if (!full) {
        console.log('🌐 API CALL: Fetching answer');
        const response = await fetch(`/api/questions/${current.id}?reveal=true`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        
        if (!response.ok) throw new Error('Failed to fetch answer');
        full = await response.json();
        
        // ✅ Cache the answer
        queryClient.setQueryData(cacheKey, full, {
          staleTime: Infinity, // Answers never change
        });
      } else {
        console.log('🚀 Using cached answer');
      }
      
      setReveal({
        answer: full.answer,
        answerImage: full.answerImage,
        answerOneLiner: full.answerOneLiner,
      });
      
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    } catch (error) {
      console.error('Failed to fetch answer:', error);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Load first question
  useEffect(() => {
    fetchRandom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Navigation
  const goBack = () => {
    setReveal(null);
    setShowCelebration(false);
    setIdx(i => Math.max(0, i - 1));
  };

  const goNext = () => {
    setShowCelebration(false);
    if (idx < stack.length - 1) {
      // ✅ Use cached question from stack
      console.log('🚀 Using question from stack (cached)');
      setReveal(null);
      setIdx(i => i + 1);
    } else {
      // ✅ Fetch new question
      fetchRandom();
    }
  };

  // ✅ Admin functions (unchanged)
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
      setReveal(null);
      setToast('Changes saved successfully!');
      
      // Invalidate cache for this question
      queryClient.removeQueries(['question', current.id]);
      
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ✅ Loading state
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
      {/* Header with Progress */}
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
              <div className="text-sm text-gray-500">Keep that brain working!</div>
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

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <button
                    onClick={toggleAnswer}
                    disabled={loading}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                      reveal 
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? (
                      <RefreshCw size={24} className="animate-spin" />
                    ) : reveal ? (
                      <EyeOff size={24} />
                    ) : (
                      <Eye size={24} />
                    )}
                    <span>
                      {loading ? 'Loading...' : reveal ? 'Hide Answer' : 'Reveal Answer'}
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
                {reveal && (
                  <div className="animate-in slide-in-from-bottom duration-500 border-t border-gray-100 pt-8">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                      {reveal.answerOneLiner && (
                        <div className="flex items-center gap-2 mb-4 text-emerald-700">
                          <CheckCircle size={20} />
                          <span className="text-lg font-medium italic">{reveal.answerOneLiner}</span>
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Sparkles size={24} className="text-emerald-600" />
                          The Answer
                        </h3>
                        <div className="text-lg text-gray-800 leading-relaxed">
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
