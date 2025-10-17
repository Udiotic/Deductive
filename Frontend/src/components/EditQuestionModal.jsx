// src/components/EditQuestionModal.jsx - Reusable question edit modal
import { useState, useEffect } from 'react';
import { patch, get } from '../lib/api';
import QuillEditor from './QuillEditor';
import ImageUpload from './ImageUpload';
import { 
  X, 
  CheckCircle, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react';

export default function EditQuestionModal({ 
  isOpen, 
  onClose, 
  questionId, 
  onSuccess,
  title = "Edit Question",
  description = "Update all aspects of this question"
}) {
  // Form state
  const [editBodyHtml, setEditBodyHtml] = useState('');
  const [editAnswerHtml, setEditAnswerHtml] = useState('');
  const [editOneLiner, setEditOneLiner] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editQuestionImages, setEditQuestionImages] = useState([]);
  const [editAnswerImage, setEditAnswerImage] = useState(null);
  
  // Loading states
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ✅ Fetch question data when modal opens
  useEffect(() => {
    if (!isOpen || !questionId) return;

    const fetchQuestionData = async () => {
      try {
        setLoadingData(true);
        setError('');
        
        console.log('🔧 Fetching full question data for editing...');
        
        // Fetch both basic and full question data
        const [basicData, fullData] = await Promise.all([
          get(`/api/questions/${questionId}`),
          get(`/api/questions/${questionId}?reveal=true`)
        ]);
        
        // Convert plain text to HTML for editors
        const toHtml = (plain) =>
          plain ? `<p>${String(plain).replace(/\n/g, '</p><p>')}</p>` : '<p></p>';

        // Populate all edit fields
        setEditBodyHtml(toHtml(basicData.body || ''));
        setEditAnswerHtml(toHtml(fullData.answer || ''));
        setEditOneLiner(fullData.answerOneLiner || '');
        setEditTags((fullData.tags || []).join(', '));
        
        // Set images
        setEditQuestionImages(basicData.images || []);
        setEditAnswerImage(fullData.answerImage || null);
        
        console.log('✅ Edit data loaded:', {
          hasAnswer: !!fullData.answer,
          questionImages: basicData.images?.length || 0,
          hasAnswerImage: !!fullData.answerImage,
          tags: fullData.tags?.length || 0
        });
        
      } catch (err) {
        console.error('❌ Failed to load edit data:', err);
        setError('Failed to load question data. Please try again.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchQuestionData();
  }, [isOpen, questionId]);

  // ✅ Handle save
  const handleSave = async () => {
    if (!questionId) return;
    
    try {
      setSaving(true);
      setError('');
      
      // Prepare payload with all fields
      const payload = {
        bodyHtml: editBodyHtml,
        answerHtml: editAnswerHtml,
        answerOneLiner: editOneLiner,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        images: editQuestionImages, // Array of question images
        answerImage: editAnswerImage // Single answer image
      };
      
      console.log('💾 Saving question with payload:', {
        hasBody: !!payload.bodyHtml,
        hasAnswer: !!payload.answerHtml,
        questionImages: payload.images.length,
        hasAnswerImage: !!payload.answerImage,
        tags: payload.tags.length
      });
      
      await patch(`/api/questions/${questionId}`, payload);
      
      // Call success callback
      onSuccess?.('Question updated successfully! ✨');
      
      // Close modal
      handleClose();
      
    } catch (err) {
      console.error('❌ Save failed:', err);
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Handle close and reset
  const handleClose = () => {
    setEditBodyHtml('');
    setEditAnswerHtml('');
    setEditOneLiner('');
    setEditTags('');
    setEditQuestionImages([]);
    setEditAnswerImage(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl max-h-[95vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <p className="text-gray-500 text-sm">{description}</p>
            </div>
            <div className="flex items-center gap-3">
              {loadingData && (
                <div className="flex items-center gap-2 text-indigo-600">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
              <button
                onClick={handleClose}
                disabled={saving}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
        
        {/* Content */}
        {loadingData ? (
          <div className="p-12 text-center">
            <RefreshCw size={32} className="animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading question data...</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Question */}
              <div className="space-y-6">
                <div className="bg-indigo-50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-indigo-900 mb-4">Question Section</h4>
                  
                  {/* Question Text */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Content</label>
                    <QuillEditor
                      value={editBodyHtml}
                      onChange={setEditBodyHtml}
                      placeholder="Enter the question..."
                    />
                  </div>

                  {/* Question Images */}
                  <div>
                    <ImageUpload
                      images={editQuestionImages}
                      onImagesChange={setEditQuestionImages}
                      maxImages={3}
                      title="Question Images"
                      description="Images that help illustrate the question"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Answer */}
              <div className="space-y-6">
                <div className="bg-emerald-50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-emerald-900 mb-4">Answer Section</h4>
                  
                  {/* Answer Text */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answer Content</label>
                    <QuillEditor
                      value={editAnswerHtml}
                      onChange={setEditAnswerHtml}
                      placeholder="Enter the answer..."
                    />
                  </div>

                  {/* Answer Image */}
                  <div>
                    <ImageUpload
                      images={editAnswerImage ? [editAnswerImage] : []}
                      onImagesChange={(images) => setEditAnswerImage(images[0] || null)}
                      maxImages={1}
                      title="Answer Image"
                      description="Image that reveals or supports the answer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section - Metadata */}
            <div className="mt-8 bg-purple-50 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-purple-900 mb-4">Additional Details</h4>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* One-liner Hint */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">One-liner Hint</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    value={editOneLiner}
                    onChange={(e) => setEditOneLiner(e.target.value)}
                    placeholder="Brief explanation or hint..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="history, logos, movies, science..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 rounded-b-2xl">
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loadingData}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
