import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import QuillEditor from '../components/QuillEditor';
import { post } from '../lib/api';
import { 
  PenTool, 
  Eye, 
  Send, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  Lightbulb,
  Image,
  Tag,
  X,
  Sparkles,
  FileText,
  Target,
  Users
} from 'lucide-react';

function GuidelinesDialog({ open, onClose }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Submission Guidelines</h2>
                <p className="text-sm text-gray-600">Create amazing deductive puzzles</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {[
              {
                icon: FileText,
                title: "Clear English",
                description: "Write questions in clear, natural English that's easy to understand."
              },
              {
                icon: Lightbulb,
                title: "Encourage Deduction",
                description: "Avoid direct trivia. Create puzzles that require deduction, pattern-spotting, or lateral thinking."
              },
              {
                icon: Sparkles,
                title: "Be Creative",
                description: "Keep it unique and creative. Don't submit near-duplicates of existing questions."
              },
              {
                icon: Image,
                title: "Include Visuals",
                description: "Your answer must include an image (reveal, logo, person, or supporting visual) and a concise one-line explanation."
              },
              {
                icon: CheckCircle,
                title: "Verify Facts",
                description: "Back claims with verifiable facts. If you reference dates, names, or quotes, they should be accurate."
              },
              {
                icon: Target,
                title: "Good Formatting",
                description: "Formatting is welcome (headings, lists, emphasis). Keep it readable and avoid excessive styling."
              },
              {
                icon: Users,
                title: "Admin Review",
                description: "Submissions are reviewed by admins. Only approved questions are published to the community."
              },
              {
                icon: AlertCircle,
                title: "Image Rights",
                description: "Confirm you have the right to use any images you upload (or they're under a suitable license)."
              }
            ].map((guideline, index) => (
              <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-200">
                  <guideline.icon size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{guideline.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{guideline.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-6 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Got it, let's create!
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditorPlayground() {
  const [bodyHtml, setBodyHtml] = useState('');
  const [answerHtml, setAnswerHtml] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [tags, setTags] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = {
      bodyHtml,
      answerHtml,
      oneLiner,
      tags,
      timestamp: Date.now()
    };
    localStorage.setItem('deductive-draft', JSON.stringify(draft));
  }, [bodyHtml, answerHtml, oneLiner, tags]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('deductive-draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        // Only load if less than 24 hours old
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setBodyHtml(draft.bodyHtml || '');
          setAnswerHtml(draft.answerHtml || '');
          setOneLiner(draft.oneLiner || '');
          setTags(draft.tags || '');
        }
      } catch (e) {
        // ignore invalid draft
      }
    }
  }, []);

  const submit = async () => {
    if (loading) return;
    
    // Basic validation
    if (!bodyHtml.trim()) {
      setErr('Please write a question');
      return;
    }
    if (!answerHtml.trim()) {
      setErr('Please write an answer');
      return;
    }

    setLoading(true);
    setMsg('');
    setErr('');
    
    try {
      const res = await post('/api/questions/submit', {
        bodyHtml,
        answerHtml,
        answerOneLiner: oneLiner,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      
      setMsg('Question submitted successfully! It will be reviewed by our team.');
      
      // Clear form and draft
      setBodyHtml('');
      setAnswerHtml('');
      setOneLiner('');
      setTags('');
      localStorage.removeItem('deductive-draft');
      
      // Clear success message after 5 seconds
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setErr(e?.message || 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear everything?')) {
      setBodyHtml('');
      setAnswerHtml('');
      setOneLiner('');
      setTags('');
      localStorage.removeItem('deductive-draft');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Toast Notifications */}
      {msg && (
        <div className="fixed top-20 right-6 z-40 animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 max-w-sm">
            <CheckCircle size={20} />
            <span className="font-medium text-sm">{msg}</span>
          </div>
        </div>
      )}

      {err && (
        <div className="fixed top-20 right-6 z-40 animate-in slide-in-from-right duration-300">
          <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 max-w-sm">
            <AlertCircle size={20} />
            <span className="font-medium text-sm">{err}</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center">
                <PenTool size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Create Question</h1>
                <p className="text-gray-600">Craft a deductive puzzle that challenges minds and sparks curiosity</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGuidelines(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <BookOpen size={18} />
                <span className="font-medium">Guidelines</span>
              </button>
              
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Eye size={18} />
                <span className="font-medium">{showPreview ? 'Hide' : 'Show'} Preview</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`grid gap-8 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Editor Section */}
          <div className="space-y-6">
            {/* Question Editor */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <Lightbulb size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Your Question</h3>
                  <p className="text-sm text-gray-600">Write the puzzle that will challenge players</p>
                </div>
              </div>
              <QuillEditor 
                value={bodyHtml} 
                onChange={setBodyHtml} 
                placeholder="What's your deductive challenge? Think patterns, logic, lateral thinking..."
              />
            </div>

            {/* Answer Editor */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">The Answer</h3>
                  <p className="text-sm text-gray-600">Provide the solution with visual proof (image required)</p>
                </div>
              </div>
              <QuillEditor 
                value={answerHtml} 
                onChange={setAnswerHtml} 
                placeholder="Reveal the answer here. Don't forget to include an image that supports your answer..."
              />
            </div>

            {/* Meta Information */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Tag size={18} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Additional Details</h3>
                  <p className="text-sm text-gray-600">Add context and categorization</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    One-line Hint (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                    placeholder="A brief, intriguing hint..."
                    value={oneLiner}
                    onChange={(e) => setOneLiner(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                    placeholder="history, logos, movies, science..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={submit}
                disabled={loading || !bodyHtml.trim() || !answerHtml.trim()}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-md"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={20} />
                )}
                <span>{loading ? 'Submitting...' : 'Submit Question'}</span>
              </button>
              
              <button
                onClick={clearAll}
                className="flex items-center justify-center gap-2 px-6 py-4 border border-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
              >
                <X size={18} />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Eye size={18} className="text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Live Preview</h3>
                </div>

                <div className="space-y-6">
                  {/* Question Preview */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">How players will see your question:</h4>
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100 min-h-[100px]">
                      {bodyHtml ? (
                        <div 
                          className="prose max-w-none text-gray-800"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }}
                        />
                      ) : (
                        <div className="text-gray-400 italic">Your question will appear here...</div>
                      )}
                    </div>
                  </div>

                  {/* Answer Preview */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Answer reveal:</h4>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 min-h-[100px]">
                      {oneLiner && (
                        <div className="flex items-center gap-2 mb-3 text-emerald-700">
                          <Sparkles size={16} />
                          <span className="text-sm font-medium italic">{oneLiner}</span>
                        </div>
                      )}
                      {answerHtml ? (
                        <div 
                          className="prose max-w-none text-gray-800"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(answerHtml) }}
                        />
                      ) : (
                        <div className="text-gray-400 italic">Your answer will appear here...</div>
                      )}
                    </div>
                  </div>

                  {/* Tags Preview */}
                  {tags && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Tags:</h4>
                      <div className="flex flex-wrap gap-2">
                        {tags.split(',').map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines Modal */}
      <GuidelinesDialog open={showGuidelines} onClose={() => setShowGuidelines(false)} />
    </div>
  );
}
