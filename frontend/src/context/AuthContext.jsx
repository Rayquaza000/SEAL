import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setWorkspaces(data.workspaces);
      if (data.workspaces.length > 0 && !activeWorkspace) {
        const saved = localStorage.getItem('seal_active_workspace');
        const found = data.workspaces.find((w) => w.id === parseInt(saved));
        setActiveWorkspace(found || data.workspaces[0]);
      }
    } catch {
      localStorage.removeItem('seal_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('seal_token');
    if (token) fetchMe();
    else setLoading(false);
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('seal_token', data.token);
    setUser(data.user);
    await fetchMe();
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('seal_token', data.token);
    setUser(data.user);
    await fetchMe();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('seal_token');
    localStorage.removeItem('seal_active_workspace');
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
  };

  const switchWorkspace = (workspace) => {
    setActiveWorkspace(workspace);
    localStorage.setItem('seal_active_workspace', workspace.id);
  };

  const addWorkspace = (workspace) => {
    setWorkspaces((prev) => [workspace, ...prev]);
    switchWorkspace(workspace);
  };

  const removeWorkspace = (workspaceId) => {
    const remaining = workspaces.filter(w => w.id !== workspaceId);
    setWorkspaces(remaining);
    if (activeWorkspace?.id === workspaceId) {
      setActiveWorkspace(remaining[0] || null);
      if (remaining[0]) localStorage.setItem('seal_active_workspace', remaining[0].id);
      else localStorage.removeItem('seal_active_workspace');
    }
  };

  const isOwner = activeWorkspace?.role === 'owner';

  return (
    <AuthContext.Provider value={{
      user, workspaces, activeWorkspace, loading,
      login, register, logout, switchWorkspace, addWorkspace, removeWorkspace,
      isOwner, fetchMe,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};