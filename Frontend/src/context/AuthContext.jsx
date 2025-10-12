import { createContext, useContext, useEffect, useState } from 'react';
import { get, post } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);

  // On app boot: try session user
  useEffect(() => {
    (async () => {
      try {
        const me = await get('/api/auth/me'); // 200 if logged in
        setUser(me);
      } catch {
        setUser(null); // 401 is fine
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  const signup = async ({ email, password, username }) => {
    return post('/api/auth/signup', { email, password, username });
    // NOTE: backend does not log in until email is verified
  };

  const login = async ({ email, username, password }) => {
    try {
      const result = await post('/api/auth/login', { email, username, password });
      // Only call /me if login was successful
      const me = await get('/api/auth/me');
      setUser(me);
      return me;
    } catch (error) {
      // Don't call /me if login failed, just rethrow the error
      throw error;
    }
  };

  const logout = async () => {
    try {
      await post('/api/auth/logout', {});
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await get('/api/auth/me');
      setUser(response);
    } catch (error) {
      setUser(null);
    }
  };

  return (
    <AuthCtx.Provider value={{ user, signup, login, logout, booted, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
