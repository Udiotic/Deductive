// src/components/GameHeader.jsx - Reusable game header component
import { ChevronLeft, ChevronRight, RefreshCw, Trophy } from 'lucide-react';

export default function GameHeader({
  questionNumber,
  score,
  mode = "Casual Solo Mode",
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  loading = false
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-16 z-40">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={loading || !canGoPrevious}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            <span className="font-medium">Previous</span>
          </button>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">Question {questionNumber}</div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Trophy size={16} />
                <span>Score: {score}</span>
              </div>
              <div className="text-gray-400">•</div>
              <div>{mode}</div>
            </div>
          </div>

          <button
            onClick={onNext}
            disabled={loading || !canGoNext}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-medium">{loading ? 'Loading...' : 'Next'}</span>
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
