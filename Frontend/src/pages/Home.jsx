import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Users, Trophy, Zap, ArrowRight, Play, PlusCircle, CheckCircle } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, booted } = useAuth();

  const features = [
    {
      icon: Brain,
      title: "Deductive Logic",
      description: "Questions that require reasoning, pattern recognition, and lateral thinking—not just memorization."
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get detailed explanations for every answer to understand the logic behind each question."
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Questions created by our community of puzzle enthusiasts and logic lovers."
    },
    {
      icon: Trophy,
      title: "Progressive Difficulty",
      description: "Start easy and work your way up to mind-bending challenges that test your limits."
    }
  ];

  const stats = [
    { label: "Active Players", value: "10K+" },
    { label: "Questions", value: "2.5K+" },
    { label: "Success Rate", value: "73%" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/20 to-purple-100/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Think
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Beyond</span>
              <br />
              The Obvious
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Welcome to <strong>Deductive</strong> — where every question is a puzzle waiting to be solved through logic, reasoning, and clever thinking.
            </p>

            {booted && user ? (
              <div className="space-y-4">
                <p className="text-lg text-gray-700">
                  Welcome back, <span className="font-semibold text-indigo-600">{user.username}</span>! 👋
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={() => navigate('/play')}>
                    <Play size={18} className="mr-2" />
                    Continue Playing
                  </Button>
                  <Button onClick={() => navigate('/editor-test')} variant="secondary">
                    <PlusCircle size={18} className="mr-2" />
                    Create Question
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/signup')}>
                  Start Your Journey
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button onClick={() => navigate('/login')} variant="secondary">
                  Sign In
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Deductive is Different
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We believe in challenging your mind, not just your memory. Every question is crafted to make you think.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-indigo-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">Simple steps to start your deductive journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Sign Up",
                description: "Create your account in seconds and join our community of logical thinkers."
              },
              {
                step: "02", 
                title: "Choose Your Challenge",
                description: "Browse questions by difficulty and topic, or let us surprise you with a random puzzle."
              },
              {
                step: "03",
                title: "Think & Deduce",
                description: "Use logic, reasoning, and pattern recognition to crack each carefully crafted question."
              }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Challenge Your Mind?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join thousands of players who are already sharpening their deductive skills with our unique puzzle platform.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/signup')}
                className="bg-white text-indigo-600 hover:bg-gray-50 font-semibold px-8 py-3 rounded-full transition-all hover:scale-105 shadow-lg"
              >
                Get Started Free
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 font-semibold px-8 py-3 rounded-full transition-all hover:scale-105"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain size={24} className="text-indigo-400" />
            <span className="text-xl font-semibold">Deductive</span>
          </div>
          <p className="text-gray-400 mb-6">
            Where every question is a puzzle waiting to be solved.
          </p>
          <div className="text-sm text-gray-500">
            © 2025 Deductive. Made with 🧠 for logical thinkers.
          </div>
        </div>
      </footer>
    </div>
  );
}
