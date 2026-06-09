import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (err) { console.error(err); }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Safety guard: ensure we always send plain strings to the backend.
    // Previously, demo-account buttons were passing an object as `email`,
    // causing "Cannot deserialize java.lang.String from Object value" (JSON parse error).
    const safeEmail = typeof email === 'object'
      ? (email?.email ?? '')
      : String(email ?? '');
    const safePassword = typeof password === 'object'
      ? (password?.password ?? '')
      : String(password ?? '');

    const { data } = await authApi.login({ email: safeEmail, password: safePassword });
    const { token, user: userData } = data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
