// src/pages/Play.jsx - Refactored with components and smart cycling
import { useEffect, useState, useCallback } from 'react';
import { get } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EditQuestionModal from '../components/EditQuestionModal';
import QuestionCard from '../components/QuestionCard';
import GameHeader from '../components/GameHeader';
import { CheckCircle } from 'lucide-react';

export default function Play() {
  const { user } = useAuth();

  // Game state
  const [stack, setStack] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const current = idx >= 0 ? stack[idx] : null;

  // ✅ Smart cycling state
  const [seenQuestions, setSeenQuestions] = useState(new Set()); // Questions seen in current session
  const [totalAvailable, setTotalAvailable] = useState(null); // Total questions in database
  const [cycleNumber, setCycleNumber] = useState(1); // Which cycle we're on

  // Score and UI state
  const [score, setScore] = useState(() => {
    const saved = localStorage.getItem('casual-solo-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Save score to localStorage
  useEffect(() => {
    localStorage.setItem('casual-solo-score', score.toString());
  }, [score]);

  // ✅ Smart question fetching with cycling logic
  const fetchRandom = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Try to get unseen questions first
      const unseenCount = totalAvailable ? Math.max(0, totalAvailable - seenQuestions.size) : Infinity;
      
      let excludeIds = [];
      let prioritizeUnseen = false;

      if (unseenCount > 0 && seenQuestions.size > 0) {
        // We have unseen questions - exclude all seen ones
        excludeIds = Array.from(seenQuestions);
        prioritizeUnseen = true;
        console.log(`🎯 Prioritizing unseen questions. ${unseenCount} unseen remaining.`);
      } else if (stack.length > 0) {
        // All questions seen, exclude only recent ones to avoid immediate repeats
        const recentCount = Math.min(5, Math.floor(seenQuestions.size * 0.2)); // Exclude 20% or 5, whichever is smaller
        excludeIds = stack.slice(-recentCount).map(q => q.id);
        console.log(`🔄 All questions seen, starting cycle ${cycleNumber + 1}. Excluding last ${recentCount} questions.`);
      }

      // Step 2: Build query
      const query = excludeIds.length > 0 
        ? '?' + new URLSearchParams(excludeIds.map(id => ['excludeIds', id]))
        : '';

      let q;
      try {
        // Try with exclusions first
        q = await get('/api/questions/random' + query);
      } catch (error) {
        if (error.message?.includes('No questions available') && excludeIds.length > 0) {
          // No questions available with exclusions, try without
          console.log('🔄 No questions available with exclusions, fetching without restrictions');
          q = await get('/api/questions/random');
        } else {
          throw error;
        }
      }

      // Step 3: Update state
      const questionId = q.id || q._id;
      
      // Update seen questions
      const newSeenQuestions = new Set(seenQuestions);
      const wasNewQuestion = !newSeenQuestions.has(questionId);
      newSeenQuestions.add(questionId);
      setSeenQuestions(newSeenQuestions);

      // If this was an unseen question and we just completed seeing all questions
      if (wasNewQuestion && totalAvailable && newSeenQuestions.size >= totalAvailable) {
        setCycleNumber(prev => prev + 1);
        showToast(`🎉 Cycle ${cycleNumber} complete! Starting fresh cycle.`);
      }

      // Update question stack
      setStack(prev => [...prev.slice(0, idx + 1), q]);
      setIdx(prev => prev + 1);

      // Step 4: Get total count if we don't have it
      if (totalAvailable === null) {
        try {
          const statsResponse = await get('/api/questions/stats'); // You'll need to create this endpoint
          if (statsResponse.approved) {
            setTotalAvailable(statsResponse.approved);
            console.log(`📊 Total approved questions: ${statsResponse.approved}`);
          }
        } catch (error) {
          console.log('Could not fetch question stats:', error);
        }
      }

    } catch (error) {
      console.error('Failed to fetch question:', error);
      showToast('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [stack, idx, seenQuestions, totalAvailable, cycleNumber]);

  // Helper function to show toast
  const showToast = (message, duration = 3000) => {
    setToast(message);
    setTimeout(() => setToast(''), duration);
  };

  // Handle score updates
  const handleScoreUpdate = (points) => {
    setScore(prev => prev + points);
  };

  // Handle edit success
  const handleEditSuccess = (message) => {
    showToast(message);
    
    // Refresh current question data
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

  // Navigation functions
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
      <div className="min-h-[80vh] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your next challenge...</p>
          {seenQuestions.size > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Questions seen: {seenQuestions.size}
              {totalAvailable && ` / ${totalAvailable}`}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* ✅ Game Header Component */}
      <GameHeader
        questionNumber={Math.max(0, idx) + 1}
        score={score}
        mode={`Casual Solo • Cycle ${cycleNumber}`}
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
            <CheckCircle size={20} />
            <span className="font-medium text-sm">{toast}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {current ? (
          <div className="space-y-8">
            {/* ✅ Question Card Component */}
            <QuestionCard
              question={current}
              onNextQuestion={goNext}
              onShowToast={showToast}
              onScoreUpdate={handleScoreUpdate}
              onEditQuestion={() => setEditOpen(true)}
              user={user}
              mode="casual-solo"
            />

            {/* Progress Info */}
            {totalAvailable && (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Progress: {seenQuestions.size} / {totalAvailable} questions seen
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (seenQuestions.size / totalAvailable) * 100)}%` }}
                      />
                    </div>
                    <span className="text-indigo-600 font-medium">
                      {Math.round((seenQuestions.size / totalAvailable) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
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

      {/* ✅ Edit Modal */}
      <EditQuestionModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        questionId={current?.id}
        onSuccess={handleEditSuccess}
        title="Edit Question"
        description="Update all aspects of this question"
      />
    </div>
  );
}
