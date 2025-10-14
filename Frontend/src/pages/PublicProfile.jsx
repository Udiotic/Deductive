import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { get, post, del} from '../lib/api';
import { 
  User, 
  Users, 
  UserPlus, 
  Calendar,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Sparkles,
  X,
  UserCheck,
  UserX
} from 'lucide-react';

export default function PublicProfile() {
  const { username } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  // lists
  const [subs, setSubs] = useState([]);
  const [subsMeta, setSubsMeta] = useState({ page: 1, pages: 1, total: 0, loading: true });
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followersMeta, setFollowersMeta] = useState({ loading: false });
  const [followingMeta, setFollowingMeta] = useState({ loading: false });

  // modals
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const p = await get(`/api/users/${encodeURIComponent(username)}/profile`);
        setProfile(p);
      } catch (e) {
        setErr(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  async function loadSubs(page = 1) {
    setSubsMeta(m => ({ ...m, loading: true }));
    try {
      const res = await get(`/api/users/${encodeURIComponent(username)}/submissions?page=${page}&limit=12`);
      setSubs(res.items || []);
      setSubsMeta({ page: res.page || 1, pages: res.pages || 1, total: res.total || 0, loading: false });
    } catch {
      setSubsMeta(m => ({ ...m, loading: false }));
    }
  }

  async function loadFollowers() {
    setFollowersMeta({ loading: true });
    try {
      const res = await get(`/api/users/${encodeURIComponent(username)}/followers?page=1&limit=20`);
      setFollowers(res.items || []);
      setFollowersMeta({ loading: false });
    } catch {
      setFollowersMeta({ loading: false });
    }
  }

  async function loadFollowing() {
    setFollowingMeta({ loading: true });
    try {
      const res = await get(`/api/users/${encodeURIComponent(username)}/following?page=1&limit=20`);
      setFollowing(res.items || []);
      setFollowingMeta({ loading: false });
    } catch {
      setFollowingMeta({ loading: false });
    }
  }

  useEffect(() => { loadSubs(1); }, [username]);
  useEffect(() => { if (followersOpen) loadFollowers(); }, [followersOpen, username]);
  useEffect(() => { if (followingOpen) loadFollowing(); }, [followingOpen, username]);

  const avatarUrl = useMemo(() => {
    const key = profile?.avatar || 'robot';
    const map = {
      robot: 'https://api.dicebear.com/9.x/bottts/svg?seed=deductive',
      cat: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=cat',
      fox: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=fox',
      owl: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=owl',
      alien: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=alien',
    };
    return map[key] || map.robot;
  }, [profile]);

  const joined = useMemo(() => {
    if (!profile?.createdAt) return '';
    return new Date(profile.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  }, [profile?.createdAt]);

  // ✅ OPTIMISTIC FOLLOW/UNFOLLOW
  async function toggleFollow() {
    if (!profile || profile.isSelf || busy) return;

    // Store original state for potential rollback
    const originalState = {
      isFollowing: profile.isFollowing,
      followersCount: profile.followersCount ?? 0
    };

    const wasFollowing = profile.isFollowing;

    try {
      // ✅ INSTANTLY update UI (no loading state!)
      setProfile(p => p ? {
        ...p,
        isFollowing: !wasFollowing,
        followersCount: wasFollowing 
          ? Math.max(0, (p.followersCount ?? 0) - 1)
          : (p.followersCount ?? 0) + 1
      } : p);

      // ✅ Show immediate feedback
      setToast(wasFollowing ? 'Unfollowed!' : 'Following!');
      setTimeout(() => setToast(''), 2000);

      // ✅ Set subtle busy state (for preventing double-clicks)
      setBusy(true);

      // ✅ Background API call (user doesn't see this)
      if (wasFollowing) {
        await del(`/api/users/${encodeURIComponent(username)}/follow`);
      } else {
        await post(`/api/users/${encodeURIComponent(username)}/follow`);
      }

      // ✅ Success - keep the optimistic update
      console.log('✅ Follow/unfollow confirmed by server');

    } catch (error) {
      console.error('❌ Follow/unfollow failed:', error);

      // ✅ ROLLBACK - revert to original state
      setProfile(p => p ? {
        ...p,
        isFollowing: originalState.isFollowing,
        followersCount: originalState.followersCount
      } : p);

      // ✅ Show error feedback
      setToast(`Failed to ${wasFollowing ? 'unfollow' : 'follow'}. Please try again.`);
      setTimeout(() => setToast(''), 3000);

    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="bg-white/60 rounded-3xl p-8 mb-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-200 rounded-2xl"></div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600">{err}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2">
            <CheckCircle size={20} />
            <span className="font-medium">{toast}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-indigo-100">
                <img 
                  src={avatarUrl} 
                  alt={`${profile.username}'s avatar`} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 truncate">{profile.username}</h1>
                <div className="flex items-center gap-2">
                  {profile.role && profile.role !== 'user' && (
                    <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium capitalize">
                      {profile.role}
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600 mb-3">
                A creative mind crafting deductive puzzles for the community
              </p>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} />
                <span>Joined {joined}</span>
              </div>
            </div>

            {/* Follow Button & Stats */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Social Stats */}
              <div className="flex gap-6">
                <button
                  onClick={() => setFollowersOpen(true)}
                  className="text-center hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <div className="text-xl font-bold text-gray-900">{profile.followersCount ?? 0}</div>
                  <div className="text-xs text-gray-500 font-medium">Followers</div>
                </button>
                <button
                  onClick={() => setFollowingOpen(true)}
                  className="text-center hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <div className="text-xl font-bold text-gray-900">{profile.followingCount ?? 0}</div>
                  <div className="text-xs text-gray-500 font-medium">Following</div>
                </button>
              </div>

              {/* ✅ OPTIMISTIC FOLLOW BUTTON */}
              {!profile.isSelf && (
                <button
                  onClick={toggleFollow}
                  disabled={false} // ✅ Never disable - always clickable
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 relative overflow-hidden group ${
                    profile.isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {/* ✅ Subtle pending indicator */}
                  {busy && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse" />
                  )}
                  
                  {/* ✅ No loading spinner - always show the action icon */}
                  {profile.isFollowing ? (
                    <UserCheck size={18} className="transition-transform group-hover:scale-110" />
                  ) : (
                    <UserPlus size={18} className="transition-transform group-hover:scale-110" />
                  )}
                  
                  <span className="relative z-10">
                    {profile.isFollowing ? 'Following' : 'Follow'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Questions Created</p>
                <p className="text-2xl font-bold text-gray-900">{subsMeta.total}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Target size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Community Impact</p>
                <p className="text-2xl font-bold text-purple-600">
                  {profile.followersCount + (subsMeta.total * 2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement Score</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {Math.min(100, Math.round((profile.followersCount * 10 + subsMeta.total * 5) / 2))}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Sparkles size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Questions by {profile.username}</h2>
              <p className="text-gray-600">Deductive puzzles crafted for the community</p>
            </div>
            {subsMeta.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadSubs(Math.max(1, subsMeta.page - 1))}
                  disabled={subsMeta.loading || subsMeta.page <= 1}
                  className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500 px-3">
                  {subsMeta.page} of {subsMeta.pages}
                </span>
                <button
                  onClick={() => loadSubs(Math.min(subsMeta.pages, subsMeta.page + 1))}
                  disabled={subsMeta.loading || subsMeta.page >= subsMeta.pages}
                  className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {subsMeta.loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-2xl p-4 h-32"></div>
              ))}
            </div>
          ) : !subs.length ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-600">{profile.username} hasn't created any questions yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subs.map((q) => (
                <div key={q.id} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-200 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Target size={16} className="text-white" />
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-4 flex-1 leading-relaxed group-hover:text-gray-900 transition-colors">
                      {q.body}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(q.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Followers Modal */}
      {followersOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Followers</h3>
              <button
                onClick={() => setFollowersOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {followersMeta.loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : !followers.length ? (
                <div className="text-center py-8 text-gray-500">
                  <Users size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No followers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                      <img
                        src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(u.avatar || 'cat')}`}
                        alt={u.username}
                        className="w-10 h-10 rounded-full border-2 border-gray-100"
                      />
                      <a
                        href={`/profile/${u.username}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                      >
                        {u.username}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {followingOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Following</h3>
              <button
                onClick={() => setFollowingOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {followingMeta.loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : !following.length ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus size={24} className="mx-auto mb-2 opacity-50" />
                  <p>Not following anyone</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {following.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                      <img
                        src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(u.avatar || 'cat')}`}
                        alt={u.username}
                        className="w-10 h-10 rounded-full border-2 border-gray-100"
                      />
                      <a
                        href={`/profile/${u.username}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                      >
                        {u.username}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
