import { useCallback, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import QuillEditor from '../components/QuillEditor';
import { get, post, patch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  User,
  Clock,
  AlertTriangle,
  Sparkles,
  FileText,
  Image as ImageIcon,
  X,
  Save,
  RefreshCw
} from 'lucide-react';

export default function AdminReview() {
  const { user } = useAuth();
  const canModerate = /^(admin|moderator)$/i.test(String(user?.role || ''));

  // list state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [err, setErr] = useState('');

  // review state
  const [current, setCurrent] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editBodyHtml, setEditBodyHtml] = useState('');
  const [editAnswerHtml, setEditAnswerHtml] = useState('');
  const [editOneLiner, setEditOneLiner] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  // action loading states
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async (p = 1) => {
    setLoadingList(true);
    setErr('');
    try {
      const qs = `?page=${p}`;
      const data = await get(`/api/admin/questions/pending${qs}`);
      setItems(data.items || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setCurrent(null);
      setReveal(null);
    } catch (e) {
      setErr(e?.message || 'Failed to load pending questions');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const pick = (q) => {
    setCurrent(q);
    setReveal(null);
  };

  const showAnswer = async () => {
    if (!current) return;
    setLoadingAnswer(true);
    try {
      const full = await get(`/api/questions/${current._id || current.id}?reveal=true`);
      setReveal({
        answer: full.answer,
        answerImage: full.answerImage,
        answerOneLiner: full.answerOneLiner,
      });
    } catch (e) {
      showToast(e?.message || 'Failed to load answer', 'error');
    } finally {
      setLoadingAnswer(false);
    }
  };

  // Edit functions
  function openEdit() {
    if (!current) return;
    const toHtml = (plain) => (plain ? `<p>${String(plain).replace(/\n/g, '</p><p>')}</p>` : '<p></p>');
    setEditBodyHtml(toHtml(current.body || ''));
    setEditAnswerHtml(toHtml(reveal?.answer || ''));
    setEditOneLiner(reveal?.answerOneLiner || '');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!current) return;
    try {
      setSaving(true);
      await patch(`/api/questions/${current._id || current.id}`, { // ✅ JWT-enabled patch
        bodyHtml: editBodyHtml,
        answerHtml: editAnswerHtml,
        answerOneLiner: editOneLiner,
      });
      showToast('Changes saved successfully!');
      setEditOpen(false);
      
      // Refresh the current question
      const refreshed = await get(`/api/questions/${current._id || current.id}`);
      setItems((prev) => prev.map(it => (String(it._id||it.id) === String(refreshed.id) ? { ...it, body: refreshed.body } : it)));
      setCurrent((c) => c ? { ...c, body: refreshed.body } : c);
    } catch (e) {
      showToast(e?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Approve/Reject functions
  async function approve() {
    if (!current) return;
    setApproving(true);
    try {
      await post(`/api/admin/questions/${current._id || current.id}/approve`); // ✅ JWT-enabled post
      setItems((prev) => prev.filter(it => String(it._id||it.id) !== String(current._id||current.id)));
      setCurrent(null);
      setReveal(null);
      showToast('Question approved successfully!');
      if (items.length === 1 && page < pages) load(page + 1);
    } catch (e) {
      showToast(e?.message || 'Approve failed', 'error');
    } finally {
      setApproving(false);
    }
  }

  async function reject() {
    if (!current) return;
    const reason = window.prompt('Reason for rejection (optional):', '');
    if (reason === null) return; // User cancelled
    
    setRejecting(true);
    try {
      await post(`/api/admin/questions/${current._id || current.id}/reject`, { reason }); // ✅ JWT-enabled post
      setItems((prev) => prev.filter(it => String(it._id||it.id) !== String(current._id||current.id)));
      setCurrent(null);
      setReveal(null);
      showToast('Question rejected');
      if (items.length === 1 && page < pages) load(page + 1);
    } catch (e) {
      showToast(e?.message || 'Reject failed', 'error');
    } finally {
      setRejecting(false);
    }
  }

  const pageInfo = useMemo(() => {
    if (!total) return 'No submissions';
    return `${total} pending submission${total === 1 ? '' : 's'}`;
  }, [total]);

  if (!canModerate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Moderator or admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-white ${
            toastType === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          }`}>
            {toastType === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="font-medium text-sm">{toast}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center">
                <Shield size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Review</h1>
                <p className="text-gray-600">Review and moderate pending submissions</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-600">{pageInfo}</div>
            </div>
          </div>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8">
            {err}
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Submissions List */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Pending Submissions</h2>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    disabled={page <= 1 || loadingList}
                    onClick={() => load(page - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-600 px-2">{page}/{pages}</span>
                  <button
                    className="p-2 border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    disabled={page >= pages || loadingList}
                    onClick={() => load(page + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-auto">
                {loadingList ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-100 rounded-2xl p-4 h-20"></div>
                    ))}
                  </div>
                ) : items.length ? (
                  items.map((item) => (
                    <button
                      key={item._id || item.id}
                      className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                        String(current?._id || current?.id) === String(item._id || item.id)
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                          : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                      onClick={() => pick(item)}
                    >
                      <div className="line-clamp-2 text-sm text-gray-800 mb-2 leading-relaxed">
                        {item.body}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User size={12} />
                        <span>@{item.submittedBy?.username || 'Unknown'}</span>
                        <Clock size={12} className="ml-2" />
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={24} className="text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-gray-600 text-sm">No pending submissions to review.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8">
              {!current ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Submission</h3>
                  <p className="text-gray-600">Choose a question from the list to review and moderate.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header Actions */}
                  <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {current.submittedBy?.username?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          @{current.submittedBy?.username || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(current.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={showAnswer}
                        disabled={loadingAnswer}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {loadingAnswer ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Eye size={16} />
                        )}
                        <span>{reveal ? 'Reload Answer' : 'Show Answer'}</span>
                      </button>
                      
                      <button
                        onClick={openEdit}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <Edit3 size={16} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Sparkles size={20} className="text-indigo-500" />
                      Question
                    </h3>
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100">
                      <div className="prose max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {current.body}
                      </div>
                      {current.images?.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {current.images.map((im, i) => (
                            <div key={i} className="relative group">
                              <img 
                                src={im.url} 
                                alt={im.alt || ''} 
                                className="w-full rounded-2xl shadow-sm group-hover:shadow-lg transition-shadow" 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answer Content */}
                  {reveal && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle size={20} className="text-emerald-500" />
                        Answer
                      </h3>
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                        {reveal.answerOneLiner && (
                          <div className="flex items-center gap-2 mb-4 text-emerald-700">
                            <Sparkles size={16} />
                            <span className="font-medium italic">{reveal.answerOneLiner}</span>
                          </div>
                        )}
                        <div className="text-gray-800 leading-relaxed mb-4">
                          {reveal.answer}
                        </div>
                        {reveal.answerImage?.url && (
                          <div className="mt-4">
                            <img
                              src={reveal.answerImage.url}
                              alt={reveal.answerImage.alt || ''}
                              className="rounded-2xl shadow-sm max-w-full h-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                    <button
                      onClick={reject}
                      disabled={rejecting}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600 disabled:opacity-50 transition-all duration-200 hover:scale-[1.02]"
                    >
                      {rejecting ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <XCircle size={18} />
                      )}
                      <span>{rejecting ? 'Rejecting...' : 'Reject'}</span>
                    </button>

                    <button
                      onClick={approve}
                      disabled={approving}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-all duration-200 hover:scale-[1.02]"
                    >
                      {approving ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                      <span>{approving ? 'Approving...' : 'Approve'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Edit Submission</h3>
                <button
                  onClick={() => setEditOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Content
                </label>
                <QuillEditor
                  value={editBodyHtml}
                  onChange={setEditBodyHtml}
                  placeholder="Enter the question..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer Content
                </label>
                <QuillEditor
                  value={editAnswerHtml}
                  onChange={setEditAnswerHtml}
                  placeholder="Enter the answer..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  One-liner Summary
                </label>
                <input
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Brief explanation or hint..."
                  value={editOneLiner}
                  onChange={(e) => setEditOneLiner(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-gray-100">
              <button
                onClick={() => setEditOpen(false)}
                className="px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
