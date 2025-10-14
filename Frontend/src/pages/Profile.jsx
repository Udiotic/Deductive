// src/pages/Profile.jsx - Complete replacement
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useProfileQuery,
  useMySubmissionsQuery,
  useFollowersQuery,
  useFollowingQuery,
  useUpdateProfileMutation,
  usePublicProfileQuery
} from '../hooks/useQueries';
import { 
  User, 
  Users, 
  UserPlus, 
  Edit3, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Award,
  Target,
  TrendingUp,
  PlusCircle,
  Sparkles,
  Settings,
  Camera,
  X
} from 'lucide-react';

const AVATARS = [
  { key: 'robot', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=deductive', name: 'Robot' },
  { key: 'cat', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=cat', name: 'Cat' },
  { key: 'fox', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=fox', name: 'Fox' },
  { key: 'owl', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=owl', name: 'Owl' },
  { key: 'alien', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=alien', name: 'Alien' },
];

export default function Profile() {
  const queryClient = useQueryClient();

  // ✅ React Query hooks
  const { 
    data: profile, 
    isLoading: profileLoading, 
    error: profileError 
  } = useProfileQuery();

  const { 
    data: submissionsData, 
    isLoading: submissionsLoading 
  } = useMySubmissionsQuery(1, 12);

  const { 
    data: followersData, 
    isLoading: followersLoading,
    refetch: refetchFollowers
  } = useFollowersQuery(profile?.username);

  const { 
    data: followingData, 
    isLoading: followingLoading,
    refetch: refetchFollowing
  } = useFollowingQuery(profile?.username);

  const updateProfileMutation = useUpdateProfileMutation();

  // ✅ Modal states
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState('robot');
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');

  // ✅ Get social counts from public profile
  const { data: publicProfile } = usePublicProfileQuery(profile?.username);

  const followersCount = publicProfile?.followersCount ?? 0;
  const followingCount = publicProfile?.followingCount ?? 0;

  // ✅ Computed values
  const joinedStr = useMemo(() => {
    if (!profile?.createdAt) return '';
    return new Date(profile.createdAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }, [profile?.createdAt]);

  const currentAvatarUrl = useMemo(() =>
    AVATARS.find(a => a.key === (profile?.avatar || 'robot'))?.url ||
    'https://api.dicebear.com/9.x/bottts/svg?seed=deductive',
    [profile?.avatar]
  );

  // ✅ Stats calculations
  const subs = submissionsData?.items || [];
  const subsTotal = submissionsData?.total || 0;
  const approvedCount = subs.filter(s => s.status === 'approved').length;
  const pendingCount = subs.filter(s => s.status === 'pending').length;
  const rejectedCount = subs.filter(s => s.status === 'rejected').length;

  // ✅ Handle modal opens with data fetching
  const handleFollowersOpen = () => {
    setFollowersOpen(true);
    if (!followersData) {
      refetchFollowers();
    }
  };

  const handleFollowingOpen = () => {
    setFollowingOpen(true);
    if (!followingData) {
      refetchFollowing();
    }
  };

  // ✅ Avatar update function
  const updateAvatar = async () => {
    if (pendingAvatar === profile?.avatar) return;
    
    try {
      await updateProfileMutation.mutateAsync({ avatar: pendingAvatar });
      setToast('Avatar updated successfully!');
      setTimeout(() => setToast(''), 3000);
      setPickerOpen(false);
      setErr('');
    } catch (e) {
      setErr(e?.message || 'Update failed');
      setTimeout(() => setErr(''), 3000);
    }
  };

  // ✅ Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="bg-white/60 rounded-3xl p-8 mb-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/60 rounded-2xl p-6 h-32"></div>
              <div className="bg-white/60 rounded-2xl p-6 h-32"></div>
              <div className="bg-white/60 rounded-2xl p-6 h-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load profile</h2>
          <p className="text-gray-600">{profileError?.message || 'Please try again'}</p>
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

      {err && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-lg">
            <span className="font-medium">{err}</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar Section */}
            <div className="flex-shrink-0">
              <div className="relative group">
                <button
                  onClick={() => {
                    setPendingAvatar(profile.avatar || 'robot');
                    setPickerOpen(true);
                  }}
                  className="block w-24 h-24 rounded-2xl overflow-hidden border-4 border-indigo-100 hover:border-indigo-300 transition-all duration-200 group-hover:scale-105"
                >
                  <img 
                    src={currentAvatarUrl} 
                    alt="Profile avatar" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={20} className="text-white" />
                  </div>
                </button>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white">
                  <Edit3 size={14} className="text-white" />
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 truncate">{profile.username}</h1>
                <div className="flex items-center gap-2">
                  {profile.verified ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      <CheckCircle size={12} />
                      Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      <Clock size={12} />
                      Unverified
                    </div>
                  )}
                  <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium capitalize">
                    {profile.role}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 mb-3 truncate">{profile.email}</p>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} />
                <span>Joined {joinedStr}</span>
              </div>
            </div>

            {/* Social Stats */}
            <div className="flex gap-6">
              <button
                onClick={handleFollowersOpen}
                className="text-center hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors"
              >
                <div className="text-2xl font-bold text-gray-900">{followersCount}</div>
                <div className="text-xs text-gray-500 font-medium">Followers</div>
              </button>
              <button
                onClick={handleFollowingOpen}
                className="text-center hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors"
              >
                <div className="text-2xl font-bold text-gray-900">{followingCount}</div>
                <div className="text-xs text-gray-500 font-medium">Following</div>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900">{subsTotal}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Target size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {subsTotal > 0 ? Math.round((approvedCount / subsTotal) * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Create Question CTA */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Ready to Create Something Amazing?</h3>
                <p className="text-indigo-100 text-lg">Share your deductive puzzles with the community and challenge other minds.</p>
              </div>
              <a
                href="/editor-test"
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl font-semibold hover:scale-105 transition-all duration-200 shadow-lg"
              >
                <PlusCircle size={20} />
                Create Question
              </a>
            </div>
          </div>
        </div>

        {/* Submissions Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Questions</h2>
              <p className="text-gray-600">Track the status of your submitted questions</p>
            </div>
          </div>

          {submissionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-2xl p-4 h-32"></div>
              ))}
            </div>
          ) : !subs.length ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-600 mb-6">Start by creating your first deductive puzzle!</p>
              <a
                href="/editor-test"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                <PlusCircle size={20} />
                Create Your First Question
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subs.map((q) => (
                <div key={q.id} className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm text-gray-800 line-clamp-3 flex-1 leading-relaxed">
                      {q.body}
                    </p>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      q.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-700'
                        : q.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {q.status === 'approved' && <CheckCircle size={12} />}
                      {q.status === 'pending' && <Clock size={12} />}
                      {q.status === 'rejected' && <XCircle size={12} />}
                      {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                    </div>
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

      {/* Avatar Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Choose Your Avatar</h3>
              <button
                onClick={() => setPickerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-4 mb-6">
              {AVATARS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPendingAvatar(opt.key)}
                  className={`relative rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 ${
                    opt.key === pendingAvatar
                      ? 'border-indigo-500 ring-4 ring-indigo-100'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <img src={opt.url} alt={opt.name} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPendingAvatar(profile.avatar || 'robot');
                  setPickerOpen(false);
                }}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateAvatar}
                disabled={pendingAvatar === profile.avatar || updateProfileMutation.isPending}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Avatar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {followersOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
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
              {followersLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : !followersData?.items?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <Users size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No followers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followersData.items.map((u) => (
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
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
              {followingLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : !followingData?.items?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus size={24} className="mx-auto mb-2 opacity-50" />
                  <p>Not following anyone</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followingData.items.map((u) => (
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
