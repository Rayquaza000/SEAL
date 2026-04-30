import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

function ItemModal({ item, workspaceId, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name || '',
    quantity: item?.quantity || '',
    unit: item?.unit || '',
    minThreshold: item?.min_threshold || '',
    supplier: item?.supplier || '',
    unitPrice: item?.unit_price || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/workspaces/${workspaceId}/inventory/${item.id}`, form);
        toast.success('Updated');
      } else {
        await api.post(`/workspaces/${workspaceId}/inventory`, form);
        toast.success('Item added');
      }
      qc.invalidateQueries(['inventory', workspaceId]);
      onClose();
    } catch (err) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <p className="font-semibold mb-4">{isEdit ? 'Edit Item' : 'Add Inventory Item'}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="seal-label">Item Name *</label>
            <input className="seal-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="seal-label">Quantity</label>
              <input type="number" min="0" step="0.01" className="seal-input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><label className="seal-label">Unit</label>
              <input className="seal-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="kg, pcs, m..." /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="seal-label">Min Threshold</label>
              <input type="number" min="0" step="0.01" className="seal-input" value={form.minThreshold} onChange={e => setForm({ ...form, minThreshold: e.target.value })} /></div>
            <div><label className="seal-label">Unit Price (₹)</label>
              <input type="number" min="0" step="0.01" className="seal-input" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} /></div>
          </div>
          <div><label className="seal-label">Supplier</label>
            <input className="seal-input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-black flex-1">{loading ? '...' : isEdit ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustModal({ item, workspaceId, onClose }) {
  const qc = useQueryClient();
  const [type, setType] = useState('add');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const adj = type === 'add' ? parseFloat(amount) : -parseFloat(amount);
    setLoading(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/inventory/${item.id}/adjust`, { adjustment: adj });
      toast.success('Stock adjusted');
      qc.invalidateQueries(['inventory', workspaceId]);
      onClose();
    } catch (err) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <p className="font-semibold mb-1">Adjust Stock</p>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{item.name} — current: {item.quantity} {item.unit}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd' }}>
            <button type="button" onClick={() => setType('add')}
              style={{ flex: 1, padding: '8px', fontSize: 13, fontWeight: 600, background: type === 'add' ? '#4caf50' : '#f5f5f5', color: type === 'add' ? '#fff' : '#555', border: 'none', cursor: 'pointer' }}>
              + Add
            </button>
            <button type="button" onClick={() => setType('remove')}
              style={{ flex: 1, padding: '8px', fontSize: 13, fontWeight: 600, background: type === 'remove' ? '#ef5350' : '#f5f5f5', color: type === 'remove' ? '#fff' : '#555', border: 'none', cursor: 'pointer' }}>
              − Remove
            </button>
          </div>
          <input type="number" min="0.01" step="0.01" required className="seal-input" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-black flex-1">{loading ? '...' : 'Adjust'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { activeWorkspace } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showLow, setShowLow] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', activeWorkspace?.id, search, showLow],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/inventory`, {
      params: { search, lowStock: showLow ? 'true' : undefined },
    }).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/inventory/${item.id}`);
      toast.success('Deleted');
      qc.invalidateQueries(['inventory', activeWorkspace.id]);
    } catch { toast.error('Error'); }
  };

  const inventory = data?.inventory || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="text-base font-semibold text-gray-800">Inventory:</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowLow(v => !v)}
            className="btn-outline text-xs"
            style={showLow ? { background: '#fff3e0', borderColor: '#ff9800', color: '#e65100' } : {}}
          >
            ⚠ Low Stock
          </button>
          <button onClick={() => setAddModal(true)} className="btn-black">+ Add Item</button>
        </div>
      </div>

      <input className="seal-input mb-4" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />

      <div className="seal-card p-0 overflow-hidden">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['Sr.', 'Item', 'Quantity', 'Unit', 'Min.Threshold', 'Unit Price', 'Supplier', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#555', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center' }}>
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-red-400 mx-auto" />
              </td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No inventory items yet</td></tr>
            ) : (
              inventory.map((item, i) => {
                const isLow = parseFloat(item.quantity) <= parseFloat(item.min_threshold || 0);
                return (
                  <tr key={item.id} style={{ background: isLow ? '#fff8e1' : i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#999' }}>{i + 1}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>
                      {isLow && <span style={{ color: '#ff9800', marginRight: 4 }}>⚠</span>}{item.name}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: isLow ? '#e65100' : '#222' }}>{parseFloat(item.quantity).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, color: '#666' }}>{item.unit || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, color: '#666' }}>{item.min_threshold || 0}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, color: '#666' }}>{item.unit_price ? `₹${parseFloat(item.unit_price).toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, color: '#666' }}>{item.supplier || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setAdjustItem(item)} className="btn-outline text-xs px-2 py-1">Adjust</button>
                        <button onClick={() => setEditItem(item)} className="btn-outline text-xs px-2 py-1">Edit</button>
                        <button onClick={() => handleDelete(item)} className="btn-outline text-xs px-2 py-1" style={{ color: '#e53935', borderColor: '#e53935' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {addModal && <ItemModal workspaceId={activeWorkspace.id} onClose={() => setAddModal(false)} />}
      {editItem && <ItemModal item={editItem} workspaceId={activeWorkspace.id} onClose={() => setEditItem(null)} />}
      {adjustItem && <AdjustModal item={adjustItem} workspaceId={activeWorkspace.id} onClose={() => setAdjustItem(null)} />}
    </div>
  );
}
