// src/context/AuthContext.jsx
import { createContext, useContext, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { get, post, setToken, getToken } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  
  // ✅ Use React Query for auth state
  const {
    data: user,
    isLoading,
    isError,
    refetch: refreshUser
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => get('/api/auth/me'),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    enabled: !!getToken(), // Only fetch if token exists
  });

  // ✅ Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, username, password }) => 
      post('/api/auth/login', { email, username, password }),
    onSuccess: async (data) => {
      // Token is already set by api.js
      // Update auth cache with new user data
      queryClient.setQueryData(['auth', 'me'], data);
    },
  });

  // ✅ Logout mutation  
  const logoutMutation = useMutation({
    mutationFn: () => post('/api/auth/logout', {}),
    onSettled: () => {
      // Clear token and all cached data
      setToken(null);
      queryClient.clear(); // Clear all caches
    },
  });

  // ✅ Signup function (doesn't change auth state until verification)
  const signup = async ({ email, password, username }) => {
    return post('/api/auth/signup', { email, password, username });
  };

  const login = async (credentials) => {
    const result = await loginMutation.mutateAsync(credentials);
    return result;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // ✅ Boot state: true when we've attempted to load user (success or failure)
  const booted = !isLoading || isError || !!user;

  return (
    <AuthCtx.Provider value={{ 
      user: user || null, 
      signup, 
      login, 
      logout, 
      booted,
      refreshUser,
      isLoading: loginMutation.isPending || logoutMutation.isPending
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
