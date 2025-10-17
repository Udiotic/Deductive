// src/pages/PictureMode.jsx - Picture Mode with visual questions only
import { useEffect, useState, useCallback } from 'react';
import { get } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EditQuestionModal from '../components/EditQuestionModal';
import GameHeader from '../components/GameHeader';
import { CheckCircle, Camera } from 'lucide-react';
import PictureQuestionCard from '../components/PictureQuestionCard';

export default function PictureMode() {
  const { user } = useAuth();

  // Game state
  const [stack, setStack] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const current = idx >= 0 ? stack[idx] : null;

  // Smart cycling state for visual questions
  const [seenQuestions, setSeenQuestions] = useState(new Set());
  const [totalAvailable, setTotalAvailable] = useState(null);
  const [cycleNumber, setCycleNumber] = useState(1);

  // Score and UI state
  const [score, setScore] = useState(() => {
    const saved = localStorage.getItem('picture-mode-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Save score to localStorage
  useEffect(() => {
    localStorage.setItem('picture-mode-score', score.toString());
  }, [score]);

  // ✅ Fetch random visual questions
  const fetchRandom = useCallback(async () => {
    setLoading(true);
    try {
      // Smart cycling for visual questions
      const unseenCount = totalAvailable ? Math.max(0, totalAvailable - seenQuestions.size) : Infinity;
      
      let excludeIds = [];
      let prioritizeUnseen = false;

      if (unseenCount > 0 && seenQuestions.size > 0) {
        excludeIds = Array.from(seenQuestions);
        prioritizeUnseen = true;
        console.log(`🖼️ Prioritizing unseen visual questions. ${unseenCount} unseen remaining.`);
      } else if (stack.length > 0) {
        const recentCount = Math.min(3, Math.floor(seenQuestions.size * 0.2));
        excludeIds = stack.slice(-recentCount).map(q => q.id);
        console.log(`🔄 All visual questions seen, starting cycle ${cycleNumber + 1}. Excluding last ${recentCount} questions.`);
      }

      // ✅ Add tag filter for visual questions
      const params = new URLSearchParams();
      if (excludeIds.length > 0) {
        excludeIds.forEach(id => params.append('excludeIds', id));
      }
      params.append('tags', 'visual'); // ✅ Filter for visual tag

      const query = params.toString() ? '?' + params.toString() : '';

      let q;
      try {
        q = await get('/api/questions/random' + query);
      } catch (error) {
        if (error.message?.includes('No questions available') && excludeIds.length > 0) {
          console.log('🔄 No visual questions available with exclusions, fetching without restrictions');
          q = await get('/api/questions/random?tags=visual');
        } else {
          throw error;
        }
      }

      // Update state
      const questionId = q.id || q._id;
      
      const newSeenQuestions = new Set(seenQuestions);
      const wasNewQuestion = !newSeenQuestions.has(questionId);
      newSeenQuestions.add(questionId);
      setSeenQuestions(newSeenQuestions);

      if (wasNewQuestion && totalAvailable && newSeenQuestions.size >= totalAvailable) {
        setCycleNumber(prev => prev + 1);
        showToast(`🎉 Visual Cycle ${cycleNumber} complete! Starting fresh cycle.`);
      }

      setStack(prev => [...prev.slice(0, idx + 1), q]);
      setIdx(prev => prev + 1);

      // Get total visual questions count if we don't have it
      if (totalAvailable === null) {
        try {
          const statsResponse = await get('/api/questions/stats?tags=visual');
          if (statsResponse.visual) {
            setTotalAvailable(statsResponse.visual);
            console.log(`📊 Total visual questions: ${statsResponse.visual}`);
          }
        } catch (error) {
          console.log('Could not fetch visual question stats:', error);
        }
      }

    } catch (error) {
      console.error('Failed to fetch visual question:', error);
      showToast('Failed to load visual questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [stack, idx, seenQuestions, totalAvailable, cycleNumber]);

  // Helper functions
  const showToast = (message, duration = 3000) => {
    setToast(message);
    setTimeout(() => setToast(''), duration);
  };

  const handleScoreUpdate = (points) => {
    setScore(prev => prev + points);
  };

  const handleEditSuccess = (message) => {
    showToast(message);
    
    if (current) {
      get(`/api/questions/${current.id}`).then(updated => {
        setStack(prev => {
          const newStack = [...prev];
          if (newStack[idx]) {
            newStack[idx] = updated;
          }
          return newStack;
        });
      }).catch(console.error);
    }
  };

  // Navigation
  const goBack = () => {
    setIdx(i => Math.max(0, i - 1));
  };

  const goNext = () => {
    if (idx < stack.length - 1) {
      setIdx(i => i + 1);
    } else {
      fetchRandom();
    }
  };

  // Initialize
  useEffect(() => {
    fetchRandom();
  }, []);

  // Loading state
  if (!current && loading) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your next visual challenge...</p>
          {seenQuestions.size > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Visual questions seen: {seenQuestions.size}
              {totalAvailable && ` / ${totalAvailable}`}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Game Header */}
      <GameHeader
        questionNumber={Math.max(0, idx) + 1}
        score={score}
        mode={`Picture Mode • Cycle ${cycleNumber}`}
        onPrevious={goBack}
        onNext={goNext}
        canGoPrevious={idx > 0}
        canGoNext={true}
        loading={loading}
      />

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 max-w-sm">
            <Camera size={20} />
            <span className="font-medium text-sm">{toast}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {current ? (
          <div className="space-y-8">
            {/* Picture Question Card */}
            <PictureQuestionCard
              question={current}
              onNextQuestion={goNext}
              onShowToast={showToast}
              onScoreUpdate={handleScoreUpdate}
              onEditQuestion={() => setEditOpen(true)}
              user={user}
              mode="picture-mode"
            />

            {/* Progress Info for Visual Questions */}
            {totalAvailable && (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-emerald-600" />
                    <span>Visual Progress: {seenQuestions.size} / {totalAvailable} questions seen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (seenQuestions.size / totalAvailable) * 100)}%` }}
                      />
                    </div>
                    <span className="text-emerald-600 font-medium">
                      {Math.round((seenQuestions.size / totalAvailable) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Camera size={24} className="text-emerald-600" />
            </div>
            <div className="text-xl text-gray-600">No visual questions available right now</div>
            <p className="text-gray-500 mt-2">Questions need the "visual" tag to appear in Picture Mode</p>
            <button
              onClick={fetchRandom}
              className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditQuestionModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        questionId={current?.id}
        onSuccess={handleEditSuccess}
        title="Edit Visual Question"
        description="Update this visual puzzle question"
      />
    </div>
  );
}
