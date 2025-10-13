import { createContext, useContext, useEffect, useState } from 'react';
import { get, post, getToken, setToken } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        if (token) {
        
          const me = await get('/api/auth/me');
          setUser(me);
        } else {
    
          setUser(null);
        }
      } catch (error) {
    
        console.log('Token validation failed:', error.message);
        setToken(null);
        setUser(null);
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
      
 
      const me = await get('/api/auth/me');
      setUser(me);
      return me;
    } catch (error) {
    
      throw error;
    }
  };

  const logout = async () => {
    try {
  
      await post('/api/auth/logout', {});
    } catch (error) {
  
      console.log('Logout request failed:', error.message);
    } finally {

      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await get('/api/auth/me');
      setUser(response);
    } catch (error) {
      setToken(null);
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
