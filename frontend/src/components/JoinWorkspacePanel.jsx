import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function JoinWorkspacePanel({ compact = false }) {
  const { fetchMe } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get('/workspaces/search', { params: { q: query } });
      setResults(data.workspaces);
      setSearched(true);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (workspaceId) => {
    setRequesting(workspaceId);
    try {
      await api.post('/workspaces/join-request', { workspaceId });
      toast.success('Join request sent! Wait for an owner to approve.');
      setResults(prev =>
        prev.map(w => w.id === workspaceId ? { ...w, request_pending: true } : w)
      );
      fetchMe();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending request');
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="seal-card" style={{ borderRadius: 16, padding: compact ? 16 : 20 }}>
      {!compact && (
        <>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Join a Workspace</p>
          <p style={{ fontSize: 13, color: '#999', marginBottom: 14 }}>
            Search by workspace name and send a join request. An owner will need to approve it.
          </p>
        </>
      )}
      {compact && (
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: '#555' }}>🔍 Find & Join a Workspace</p>
      )}

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          className="seal-input"
          placeholder="Search workspace name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={loading} className="btn-black" style={{ flexShrink: 0 }}>
          {loading ? '...' : 'Search'}
        </button>
      </form>

      {/* Results */}
      {searched && results.length === 0 && (
        <p style={{ fontSize: 13, color: '#bbb', textAlign: 'center', padding: '10px 0' }}>
          No workspaces found for "{query}"
        </p>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map(ws => (
            <div
              key={ws.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#f5f5f5', borderRadius: 10, padding: '10px 14px'
              }}
            >
              {/* Workspace icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: '#fce4ec',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontWeight: 800, fontSize: 16, color: '#e57373'
              }}>
                {ws.name[0].toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 1 }}>{ws.name}</p>
                <p style={{ fontSize: 12, color: '#aaa' }}>{ws.member_count} member{ws.member_count !== 1 ? 's' : ''}</p>
              </div>

              {/* Action */}
              {ws.is_member ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4caf50', flexShrink: 0 }}>✓ Member</span>
              ) : ws.request_pending ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ff9800', flexShrink: 0 }}>⏳ Pending</span>
              ) : (
                <button
                  onClick={() => handleRequest(ws.id)}
                  disabled={requesting === ws.id}
                  className="btn-black"
                  style={{ flexShrink: 0, fontSize: 12, padding: '5px 12px' }}
                >
                  {requesting === ws.id ? '...' : 'Request to Join'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
