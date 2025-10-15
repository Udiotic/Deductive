// src/pages/GameModeSelection.jsx
import { Link } from 'react-router-dom';
import { 
  Brain,
  Image as ImageIcon,
  Users,
  Zap,
  Clock,
  Target,
  ArrowRight,
  Sparkles,
  Play
} from 'lucide-react';

export default function GameModeSelection() {
  const gameModes = [
    {
      id: 'casual-solo',
      title: 'Casual Solo',
      description: 'Think through puzzles at your own pace with text input answers',
      icon: Brain,
      gradient: 'from-indigo-500 to-purple-600',
      features: ['Open-ended answers', 'Hint system', 'Score tracking'],
      available: true,
      path: '/play/casual-solo'
    },
    {
      id: 'picture-mode',
      title: 'Picture Mode',
      description: 'Visual puzzles that test your observation skills',
      icon: ImageIcon,
      gradient: 'from-emerald-500 to-teal-600',
      features: ['Visual challenges', 'Image analysis', 'Pattern recognition'],
      available: false,
      path: '/play/picture-mode'
    },
    {
      id: 'multiplayer',
      title: 'Multiplayer',
      description: 'Compete with friends in real-time puzzle battles',
      icon: Users,
      gradient: 'from-orange-500 to-red-600',
      features: ['Real-time competition', 'Private rooms', 'Leaderboards'],
      available: false,
      path: '/play/multiplayer'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mb-6">
            <Play size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Challenge</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select a game mode that matches your mood and challenge level
          </p>
        </div>

        {/* Game Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {gameModes.map((mode) => {
            const IconComponent = mode.icon;
            
            return (
              <div
                key={mode.id}
                className={`group relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  mode.available 
                    ? 'cursor-pointer' 
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Coming Soon Badge */}
                {!mode.available && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Coming Soon
                  </div>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${mode.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <IconComponent size={28} className="text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{mode.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{mode.description}</p>

                {/* Features */}
                <div className="space-y-2 mb-8">
                  {mode.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`w-2 h-2 bg-gradient-to-r ${mode.gradient} rounded-full`}></div>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                {mode.available ? (
                  <Link
                    to={mode.path}
                    className={`flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r ${mode.gradient} text-white rounded-2xl font-semibold hover:opacity-90 transition-all group-hover:scale-105`}
                  >
                    <span>Start Playing</span>
                    <ArrowRight size={18} />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gray-300 text-gray-500 rounded-2xl font-semibold cursor-not-allowed"
                  >
                    <Clock size={18} />
                    <span>Coming Soon</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/20 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <Target size={24} className="text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">1000+</div>
                <div className="text-sm text-gray-600">Puzzles Available</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Zap size={24} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Instant</div>
                <div className="text-sm text-gray-600">Feedback System</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Sparkles size={24} className="text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Smart</div>
                <div className="text-sm text-gray-600">Hint System</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
