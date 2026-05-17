import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import JoinWorkspacePanel from '../components/JoinWorkspacePanel';

function JoinRequestsAlert({ workspaceId, onApprove }) {
  const { data, refetch } = useQuery({
    queryKey: ['join-requests', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/join-requests`).then(r => r.data),
    enabled: !!workspaceId,
  });
  const [handling, setHandling] = useState(null);

  const requests = data?.requests || [];
  if (requests.length === 0) return null;

  const handle = async (reqId, action) => {
    setHandling(reqId);
    try {
      await api.put(`/workspaces/${workspaceId}/join-requests/${reqId}`, { action });
      toast.success(`Request ${action}d`);
      refetch();
      onApprove();
    } catch { toast.error('Error'); }
    finally { setHandling(null); }
  };

  return (
    <div style={{
      background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 12,
      padding: '12px 16px', marginBottom: 16
    }}>
      <p style={{ fontWeight: 700, fontSize: 13, color: '#f57f17', marginBottom: 10 }}>
        ⏳ {requests.length} Pending Join Request{requests.length > 1 ? 's' : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {requests.map(req => (
          <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#fff3e0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#e65100', fontSize: 14, flexShrink: 0
            }}>
              {req.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 13 }}>{req.name}</p>
              <p style={{ fontSize: 12, color: '#aaa' }}>{req.email}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => handle(req.id, 'approve')}
                disabled={handling === req.id}
                style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Approve
              </button>
              <button
                onClick={() => handle(req.id, 'reject')}
                disabled={handling === req.id}
                style={{ background: '#fce4ec', color: '#e53935', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeWorkspace, isOwner } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const stats = data?.stats || {};
  const products = data?.recentProducts || [];

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 140px)' }}>

      {/* ── LEFT: Join panel + Recent Products ────── */}
      <div style={{ flex: 1, paddingRight: 16 }}>

        {/* ── Join another workspace (TOP) ────────── */}
        <div style={{ marginBottom: 20 }}>
          <JoinWorkspacePanel compact />
        </div>

        {/* Join requests alert (owners only) */}
        {isOwner && (
          <JoinRequestsAlert
            workspaceId={activeWorkspace?.id}
            onApprove={() => qc.invalidateQueries(['employees', activeWorkspace?.id])}
          />
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <p className="text-base font-semibold text-gray-800" style={{ marginBottom: 0 }}>Recent Products:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="seal-input"
              placeholder="Search products..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              style={{ minWidth: 180, fontSize: 13 }}
            />
            <select
              className="seal-select"
              value={productStatus}
              onChange={e => setProductStatus(e.target.value)}
              style={{ minWidth: 160, fontSize: 13 }}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {productsQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-t-2" style={{ borderColor: '#e57373' }} />
          </div>
        ) : products.length === 0 ? (
          <p style={{ color: '#bbb', fontSize: 14, textAlign: 'center', marginTop: 32 }}>No products yet</p>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            maxHeight: 'calc(100vh - 380px)', overflowY: 'auto', paddingRight: 4
          }}>
            {products.map(p => {
              const pct = parseInt(p.progress) || 0;
              return (
                <div
                  key={p.id}
                  className="seal-card"
                  onClick={() => navigate(`/products/${p.id}`)}
                  style={{ borderRadius: 16, cursor: 'pointer' }}
                  title="View product details"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</p>
                      <p style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                        Current stage: {p.current_stage || (p.status === 'completed' ? 'completed' : '—')}
                      </p>
                    </div>
                    <span style={{ fontSize: 13, color: '#555', fontWeight: 500, marginLeft: 12, flexShrink: 0 }}>{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── VERTICAL DIVIDER ──────────────────────── */}
      <div className="v-divider" />

      {/* ── RIGHT: Stats 2×3 grid ─────────────────── */}
      <div style={{ width: 380, paddingLeft: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Total projects',     value: stats.total_products },
            { label: 'Total members',      value: stats.total_members },
            { label: 'Completed projects', value: stats.completed_products },
            { label: 'Employees',          value: stats.employees },
            { label: 'Pending projects',   value: stats.pending_products },
            { label: 'Owner',              value: stats.owners },
          ].map(({ label, value }) => (
            <div key={label} className="seal-card" style={{
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 90
            }}>
              <p style={{ fontSize: 15, color: '#333', textAlign: 'center' }}>
                {label}: <strong>{value ?? '—'}</strong>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}