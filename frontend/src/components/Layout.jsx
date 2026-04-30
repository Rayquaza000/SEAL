import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import JoinWorkspacePanel from './JoinWorkspacePanel';

const NAV_ITEMS = [
  { label: 'Dashboard',  path: '/dashboard' },
  { label: 'My Tasks',   path: '/my-tasks' },
  { label: 'Products',   path: '/products' },
  { label: 'Inventory',  path: '/inventory', ownerOnly: true },
  { label: 'Billing',    path: '/billing',   ownerOnly: true },
  { label: 'Employees',  path: '/employees', ownerOnly: true },
  { label: 'Templates',  path: '/templates', ownerOnly: true },
];

export default function Layout() {
  const { user, workspaces, activeWorkspace, isOwner, switchWorkspace, logout, addWorkspace } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [creatingWs, setCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentNav = NAV_ITEMS.find(n => location.pathname.startsWith(n.path));
  const visibleNav = NAV_ITEMS.filter(n => !n.ownerOnly || isOwner);

  const handleCreateWs = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const { data } = await api.post('/workspaces', { name: newWsName.trim() });
      addWorkspace({ ...data.workspace, role: 'owner' });
      setCreatingWs(false);
      setNewWsName('');
      toast.success('Workspace created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="seal-content">
      {/* ── TOP BAR ─────────────────────────────── */}
      <header className="seal-topbar">
        <span style={{ fontSize: 26, fontWeight: 800, color: '#e57373', letterSpacing: 3 }}>
          SEAL
        </span>
        <button onClick={logout} className="btn-red text-sm px-6 py-2 rounded-lg">
          Logout
        </button>
      </header>

      {/* ── MAIN CONTENT ────────────────────────── */}
      <main className="p-6">
        {!activeWorkspace ? (
          /* No workspace yet — show create + join options */
          <div style={{ maxWidth: 480, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <p style={{ fontWeight: 700, fontSize: 20, color: '#333' }}>Welcome to SEAL 👋</p>
              <p style={{ fontSize: 14, color: '#999', marginTop: 4 }}>Create a new workspace or join an existing one to get started.</p>
            </div>

            {/* Create workspace */}
            <div className="seal-card" style={{ borderRadius: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: '#555' }}>🏢 Create a Workspace</p>
              <form onSubmit={handleCreateWs} style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  placeholder="Workspace name (e.g. Mehta Hardware)"
                  className="seal-input"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-black" style={{ flexShrink: 0 }}>Create</button>
              </form>
              <p style={{ fontSize: 12, color: '#bbb', marginTop: 8 }}>You will become the owner of this workspace.</p>
            </div>

            {/* Join workspace */}
            <JoinWorkspacePanel />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* ── BOTTOM BAR ──────────────────────────── */}
      <footer className="seal-bottombar">
        <span className="text-sm font-medium text-gray-600 mr-1 flex-shrink-0">Workspace:</span>

        {/* Workspace pills */}
        {workspaces.map(ws => (
          <button
            key={ws.id}
            onClick={() => { switchWorkspace(ws); navigate('/dashboard'); }}
            className="pill-ws"
            style={ws.id === activeWorkspace?.id ? { background: '#c8c4be', fontWeight: 700 } : {}}
          >
            {ws.name}
          </button>
        ))}

        {/* +New workspace pill */}
        {creatingWs ? (
          <form onSubmit={handleCreateWs} className="flex items-center gap-1">
            <input autoFocus value={newWsName} onChange={e => setNewWsName(e.target.value)}
              placeholder="Name" className="seal-input w-32 text-xs py-1" />
            <button type="submit" className="btn-black text-xs px-2 py-1">Create</button>
            <button type="button" onClick={() => setCreatingWs(false)} className="btn-outline text-xs px-2 py-1">✕</button>
          </form>
        ) : (
          <button onClick={() => setCreatingWs(true)} className="pill-ws-new">+New workspace</button>
        )}

        {/* Active page / nav trigger */}
        {activeWorkspace && (
          <div ref={menuRef} className="relative ml-3">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="pill-page"
              style={{ background: '#c8c4be', fontWeight: 600 }}
            >
              {currentNav?.label || 'Menu'}
            </button>

            {menuOpen && (
              <div className="absolute bottom-11 left-0 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
                style={{ minWidth: 190, border: '1px solid #ccc' }}>
                {visibleNav.map((item, i) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMenuOpen(false); }}
                    className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors"
                    style={{
                      borderBottom: i < visibleNav.length - 1 ? '1px solid #e0e0e0' : 'none',
                      fontWeight: location.pathname.startsWith(item.path) ? 700 : 400,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* User info */}
        <span className="pill-user">{user?.name}</span>
        <span className="pill-user capitalize">{activeWorkspace?.role || '—'}</span>
      </footer>
    </div>
  );
}
