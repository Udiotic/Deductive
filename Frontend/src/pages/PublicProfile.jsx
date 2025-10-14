// src/pages/PublicProfile.jsx
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  usePublicProfileQuery,
  useUserSubmissionsQuery,
  useFollowersQuery,
  useFollowingQuery,
  useFollowMutation
} from '../hooks/useQueries';
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
  UserCheck
} from 'lucide-react';

export default function PublicProfile() {
  const { username } = useParams();

  
  const queryClient = useQueryClient();

  // ✅ React Query hooks replace all useState/useEffect
  const { 
    data: profile, 
    isLoading: profileLoading, 
    error: profileError 
  } = usePublicProfileQuery(username);

  const { 
    data: subsData, 
    isLoading: subsLoading 
  } = useUserSubmissionsQuery(username, 1, 12);

  const { 
    data: followersData, 
    isLoading: followersLoading,
    refetch: refetchFollowers
  } = useFollowersQuery(username);

  const { 
    data: followingData, 
    isLoading: followingLoading,
    refetch: refetchFollowing  
  } = useFollowingQuery(username);

  const followMutation = useFollowMutation(username);

  // Modal states (unchanged)
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [toast, setToast] = useState('');

  // ✅ Avatar and date logic (unchanged)
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

  // ✅ Optimistic follow/unfollow with React Query
  const toggleFollow = async () => {
    if (!profile || profile.isSelf) return;
    
    const action = profile.isFollowing ? 'unfollow' : 'follow';
    
    try {
      await followMutation.mutateAsync(action);
      setToast(action === 'follow' ? 'Following!' : 'Unfollowed!');
      setTimeout(() => setToast(''), 2000);
    } catch (error) {
      console.error('Follow/unfollow failed:', error);
      setToast(`Failed to ${action}. Please try again.`);
      setTimeout(() => setToast(''), 3000);
    }
  };

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

  // ✅ Loading and error states
  if (profileLoading) {
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

  if (profileError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600">{profileError?.message || 'User not found'}</p>
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
                  onClick={handleFollowersOpen}
                  className="text-center hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <div className="text-xl font-bold text-gray-900">{profile.followersCount ?? 0}</div>
                  <div className="text-xs text-gray-500 font-medium">Followers</div>
                </button>
                <button
                  onClick={handleFollowingOpen}
                  className="text-center hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <div className="text-xl font-bold text-gray-900">{profile.followingCount ?? 0}</div>
                  <div className="text-xs text-gray-500 font-medium">Following</div>
                </button>
              </div>

              {/* ✅ Optimistic Follow Button */}
              {!profile.isSelf && (
                <button
                  onClick={toggleFollow}
                  disabled={followMutation.isPending}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 relative overflow-hidden group ${
                    profile.isFollowing
                      ? 'bg-gray-300 text-gray-500 cursor-pointer'
                      : followMutation.isPending 
                        ? 'bg-gray-200 text-gray-600 cursor-wait'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer'
                  }`}
                >
                  {followMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : profile.isFollowing ? (
                    <UserCheck size={18} />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  
                  <span className="relative z-10">
                    {followMutation.isPending
                      ? 'Updating...'
                      : profile.isFollowing 
                        ? 'Following' 
                        : 'Follow'
                    }
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
                <p className="text-2xl font-bold text-gray-900">{subsData?.total || 0}</p>
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
                  {profile.followersCount + ((subsData?.total || 0) * 2)}
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
                  {Math.min(100, Math.round((profile.followersCount * 10 + (subsData?.total || 0) * 5) / 2))}
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
          </div>

          {subsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-2xl p-4 h-32"></div>
              ))}
            </div>
          ) : !subsData?.items?.length ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-600">{profile.username} hasn't created any questions yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subsData.items.map((q) => (
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
