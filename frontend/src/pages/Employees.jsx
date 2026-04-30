import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

function InviteModal({ workspaceId, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/workspaces/${workspaceId}/invite`, { email });
      toast.success(`Invitation sent to ${email}`);
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontWeight: 700 }}>Invite Employee</p>
          <button onClick={onClose}><X style={{ width: 18, height: 18, color: '#999' }} /></button>
        </div>
        <form onSubmit={handleInvite} className="space-y-3">
          <div>
            <label className="seal-label">Employee Email</label>
            <input type="email" required className="seal-input" placeholder="employee@example.com"
              value={email} onChange={e => setEmail(e.target.value)} />
            <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>They will receive an invite link valid for 7 days.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-black flex-1">{loading ? 'Sending...' : 'Send Invite'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MemberDetailModal({ member, workspaceId, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);

  const { data } = useQuery({
    queryKey: ['employee-detail', workspaceId, member.id],
    queryFn: () => api.get(`/workspaces/${workspaceId}/employees/${member.id}`).then(r => r.data),
  });

  const handleRoleToggle = async () => {
    const newRole = member.role === 'owner' ? 'employee' : 'owner';
    if (!confirm(`Change ${member.name}'s role to ${newRole}?`)) return;
    setLoading(true);
    try {
      await api.put(`/workspaces/${workspaceId}/members/${member.id}/role`, { role: newRole });
      toast.success('Role updated');
      onUpdated();
      onClose();
    } catch (err) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  const handleRemove = async () => {
    if (!confirm(`Remove ${member.name} from this workspace?`)) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${member.id}`);
      toast.success('Member removed');
      onUpdated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid #eee' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fce4ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {member.avatar_url
              ? <img src={member.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
              : <span style={{ fontWeight: 800, fontSize: 20, color: '#e57373' }}>{member.name[0].toUpperCase()}</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{member.name}</p>
              <span className={member.role === 'owner' ? 'status-in_progress' : 'status-pending'}>{member.role}</span>
            </div>
            <p style={{ fontSize: 13, color: '#888' }}>{member.email}</p>
          </div>
          <button onClick={onClose}><X style={{ width: 18, height: 18, color: '#999' }} /></button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '16px 24px', borderBottom: '1px solid #eee' }}>
          {[
            { label: 'Products', value: member.products_assigned || 0 },
            { label: 'Stages Assigned', value: member.stages_assigned || 0 },
            { label: 'Stages Done', value: member.stages_completed || 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f5f5f5', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <p style={{ fontWeight: 800, fontSize: 22 }}>{value}</p>
              <p style={{ fontSize: 12, color: '#888' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Assigned items */}
        <div style={{ padding: '16px 24px', maxHeight: 260, overflowY: 'auto' }}>
          {data?.assignedProducts?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', marginBottom: 6 }}>Assigned Products</p>
              {data.assignedProducts.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                  <span>{p.name} <span style={{ color: '#aaa', fontSize: 12 }}>{p.product_code}</span></span>
                  <span className={`status-${p.status}`}>{p.status?.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
          {data?.assignedStages?.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', marginBottom: 6 }}>Assigned Stages</p>
              {data.assignedStages.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                  <span>{s.name} <span style={{ color: '#aaa', fontSize: 12 }}>in {s.product_name}</span></span>
                  <span className={`status-${s.status}`}>{s.status?.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
          {!data?.assignedProducts?.length && !data?.assignedStages?.length && (
            <p style={{ color: '#bbb', fontSize: 13, textAlign: 'center' }}>No assignments yet</p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #eee' }}>
          <button onClick={handleRoleToggle} disabled={loading} className="btn-outline flex-1">
            Make {member.role === 'owner' ? 'Employee' : 'Owner'}
          </button>
          <button onClick={handleRemove} className="btn-outline flex-1" style={{ color: '#e53935', borderColor: '#e53935' }}>
            Remove Member
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const { activeWorkspace, user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState('');
  const [handlingReq, setHandlingReq] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employees', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/employees`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const { data: reqData, refetch: refetchReqs } = useQuery({
    queryKey: ['join-requests', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/join-requests`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const handleJoinAction = async (reqId, action) => {
    setHandlingReq(reqId);
    try {
      await api.put(`/workspaces/${activeWorkspace.id}/join-requests/${reqId}`, { action });
      toast.success(`Request ${action}d`);
      refetch();
      refetchReqs();
    } catch { toast.error('Error'); }
    finally { setHandlingReq(null); }
  };

  const members = (data?.members || []).filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );
  const owners = members.filter(m => m.role === 'owner');
  const employees = members.filter(m => m.role === 'employee');
  const requests = reqData?.requests || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="text-base font-semibold text-gray-800">Employees:</p>
        <button onClick={() => setShowInvite(true)} className="btn-black">+ Invite Employee</button>
      </div>

      {/* Pending Join Requests */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#e57373', marginBottom: 8 }}>⏳ Pending Join Requests ({requests.length})</p>
          <div className="seal-card p-0 overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#fff8e1' }}>
                <tr>
                  {['Name', 'Email', 'Requested On', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888', borderBottom: '1px solid #ffe082' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>{req.name}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, color: '#666' }}>{req.email}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#999' }}>{new Date(req.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleJoinAction(req.id, 'approve')}
                          disabled={handlingReq === req.id}
                          style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleJoinAction(req.id, 'reject')}
                          disabled={handlingReq === req.id}
                          style={{ background: '#fce4ec', color: '#e53935', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search */}
      <input className="seal-input mb-4" placeholder="Search members..." value={search}
        onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />

      {/* Members Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-red-400 mx-auto" />
        </div>
      ) : (
        <div className="seal-card p-0 overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {['Sr.', 'Name', 'Email', 'Role', 'Products', 'Stages', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#555', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Owners */}
              {owners.length > 0 && (
                <tr><td colSpan={8} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', background: '#fafafa', borderBottom: '1px solid #eee' }}>Owners</td></tr>
              )}
              {owners.map((m, i) => <MemberRow key={m.id} m={m} i={i} workspaceId={activeWorkspace.id} currentUserId={currentUser.id} onSelect={setSelectedMember} />)}

              {/* Employees */}
              {employees.length > 0 && (
                <tr><td colSpan={8} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', background: '#fafafa', borderBottom: '1px solid #eee' }}>Employees</td></tr>
              )}
              {employees.map((m, i) => <MemberRow key={m.id} m={m} i={i} workspaceId={activeWorkspace.id} currentUserId={currentUser.id} onSelect={setSelectedMember} />)}

              {members.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No members found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && <InviteModal workspaceId={activeWorkspace.id} onClose={() => setShowInvite(false)} />}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          workspaceId={activeWorkspace.id}
          onClose={() => setSelectedMember(null)}
          onUpdated={refetch}
        />
      )}
    </div>
  );
}

function MemberRow({ m, i, workspaceId, currentUserId, onSelect }) {
  const bg = i % 2 === 1 ? '#fef2f2' : '#fff';
  return (
    <tr style={{ background: bg, borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ padding: '10px 14px', fontSize: 13, color: '#999' }}>{i + 1}</td>
      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>
        {m.name} {m.id === currentUserId && <span style={{ fontSize: 11, color: '#aaa' }}>(you)</span>}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 14, color: '#666' }}>{m.email}</td>
      <td style={{ padding: '10px 14px' }}>
        <span className={m.role === 'owner' ? 'status-in_progress' : 'status-pending'}>{m.role}</span>
      </td>
      <td style={{ padding: '10px 14px', fontSize: 14, color: '#555' }}>{m.products_assigned || 0}</td>
      <td style={{ padding: '10px 14px', fontSize: 14, color: '#555' }}>{m.stages_assigned || 0}</td>
      <td style={{ padding: '10px 14px', fontSize: 13, color: '#999' }}>
        {new Date(m.joined_at).toLocaleDateString('en-IN')}
      </td>
      <td style={{ padding: '10px 14px' }}>
        <button onClick={() => onSelect(m)} className="btn-outline text-xs px-2 py-1">View</button>
      </td>
    </tr>
  );
}
