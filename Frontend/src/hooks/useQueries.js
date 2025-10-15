// src/hooks/useQueries.js - Complete replacement with all hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../lib/api';

// ✅ Auth Queries
export function useAuthQuery() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => get('/api/auth/me'),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false, // Don't retry auth failures
  });
}

// ✅ Profile Queries (Personal Profile - /profile)
export function useProfileQuery() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => get('/api/profile'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,    // 15 minutes
  });
}

// ✅ Public Profile Queries (Public Profile - /profile/:username)
export function usePublicProfileQuery(username) {
  return useQuery({
    queryKey: ['profile', 'public', username],
    queryFn: () => get(`/api/users/${encodeURIComponent(username)}/profile`),
    staleTime: 5 * 60 * 1000, // 5 minutes - profiles don't change often
    enabled: !!username, // Only run if username exists
  });
}

// ✅ User Submissions (Public)
export function useUserSubmissionsQuery(username, page = 1, limit = 12) {
  return useQuery({
    queryKey: ['submissions', 'user', username, page, limit],
    queryFn: () => get(`/api/users/${encodeURIComponent(username)}/submissions?page=${page}&limit=${limit}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!username,
  });
}

// ✅ My Submissions (Personal)
export function useMySubmissionsQuery(page = 1, limit = 12) {
  return useQuery({
    queryKey: ['submissions', 'me', page, limit],
    queryFn: () => get(`/api/questions/mine?page=${page}&limit=${limit}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ✅ Followers/Following Queries
export function useFollowersQuery(username) {
  return useQuery({
    queryKey: ['followers', username],
    queryFn: () => get(`/api/users/${encodeURIComponent(username)}/followers?page=1&limit=20`),
    staleTime: 60 * 1000, // 1 minute
    enabled: false, // Only fetch when explicitly requested
  });
}

export function useFollowingQuery(username) {
  return useQuery({
    queryKey: ['following', username],
    queryFn: () => get(`/api/users/${encodeURIComponent(username)}/following?page=1&limit=20`),
    staleTime: 60 * 1000, // 1 minute
    enabled: false, // Only fetch when explicitly requested
  });
}

// ✅ Question Queries
export function useRandomQuestionQuery(excludeIds = []) {
  return useQuery({
    queryKey: ['question', 'random', excludeIds.sort().join(',')], // ✅ Stable key based on sorted excludeIds
    queryFn: async () => {
      const query = excludeIds.length
        ? '?' + new URLSearchParams(excludeIds.map(id => ['excludeIds', id])).toString()
        : '';
      console.log('🌐 API CALL: Fetching random question, excluding:', excludeIds);
      return get('/api/questions/random' + query);
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    // ✅ Only fetch when we have questions to exclude or it's the first time
    enabled: excludeIds.length > 0 || excludeIds.length === 0,
  });
}

export function useQuestionQuery(id, options = {}) {
  return useQuery({
    queryKey: ['question', id, options.reveal ? 'full' : 'basic'],
    queryFn: () => get(`/api/questions/${id}${options.reveal ? '?reveal=true' : ''}`),
    staleTime: Infinity, // Questions don't change once created
    enabled: !!id,
  });
}

// ✅ Admin Queries
export function usePendingQuestionsQuery(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['admin', 'questions', 'pending', page, limit],
    queryFn: () => get(`/api/admin/questions/pending?page=${page}&limit=${limit}`),
    staleTime: 30 * 1000, // 30 seconds - admin data should be fresh
  });
}

// ✅ Mutations
export function useFollowMutation(username) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (action) => {
      return action === 'follow' 
        ? post(`/api/users/${encodeURIComponent(username)}/follow`)
        : del(`/api/users/${encodeURIComponent(username)}/follow`);
    },
    onMutate: async (action) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['profile', 'public', username] });
      
      // Snapshot previous value
      const previousProfile = queryClient.getQueryData(['profile', 'public', username]);
      
      // Optimistically update
      queryClient.setQueryData(['profile', 'public', username], (old) => {
        if (!old) return old;
        return {
          ...old,
          isFollowing: action === 'follow',
          followersCount: action === 'follow' 
            ? (old.followersCount || 0) + 1 
            : Math.max(0, (old.followersCount || 0) - 1)
        };
      });
      
      return { previousProfile };
    },
    onError: (err, action, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile', 'public', username], context.previousProfile);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['profile', 'public', username] });
    },
  });
}

// ✅ Profile Update Mutation
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => patch('/api/profile', data),
    onSuccess: (updatedProfile) => {
      // Update the profile cache with new data
      queryClient.setQueryData(['profile', 'me'], updatedProfile);
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });
}

// ✅ Admin Mutations
export function useApproveQuestionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => post(`/api/admin/questions/${id}/approve`),
    onSuccess: () => {
      // Invalidate and refetch pending questions
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions', 'pending'] });
    },
  });
}

export function useRejectQuestionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }) => post(`/api/admin/questions/${id}/reject`, { reason }),
    onSuccess: () => {
      // Invalidate and refetch pending questions
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions', 'pending'] });
    },
  });
}
