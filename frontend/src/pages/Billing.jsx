import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

function BillModal({ bill, workspaceId, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!bill;
  const [form, setForm] = useState({
    clientName: bill?.client || '',
    productId: bill?.product_id || '',
    dueDate: bill?.due_date?.split('T')[0] || '',
    notes: bill?.notes || '',
    status: bill?.status || 'draft',
  });
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [loading, setLoading] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['products', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/products`).then(r => r.data),
  });

  useQuery({
    queryKey: ['bill-items', bill?.id],
    queryFn: () => api.get(`/workspaces/${workspaceId}/bills/${bill.id}`).then(r => {
      setItems(r.data.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unit_price })));
      return r.data;
    }),
    enabled: !!bill?.id,
  });

  const total = items.reduce((s, i) => s + parseFloat(i.quantity || 0) * parseFloat(i.unitPrice || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, items };
      if (isEdit) {
        await api.put(`/workspaces/${workspaceId}/bills/${bill.id}`, payload);
        toast.success('Bill updated');
      } else {
        await api.post(`/workspaces/${workspaceId}/bills`, payload);
        toast.success('Bill created');
      }
      qc.invalidateQueries(['bills', workspaceId]);
      qc.invalidateQueries(['bills-summary', workspaceId]);
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #eee' }}>
          <p style={{ fontWeight: 700, fontSize: 16 }}>{isEdit ? 'Edit Bill' : 'New Bill'}</p>
          <button onClick={onClose}><X style={{ width: 18, height: 18, color: '#999' }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="seal-label">Client Name *</label>
              <input className="seal-input" required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} />
            </div>
            <div>
              <label className="seal-label">Link to Product</label>
              <select className="seal-select w-full" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}>
                <option value="">— None —</option>
                {productsData?.products?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="seal-label">Due Date</label>
              <input type="date" className="seal-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            {isEdit && (
              <div>
                <label className="seal-label">Status</label>
                <select className="seal-select w-full" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <label className="seal-label">Line Items</label>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f5f5f5' }}>
                  <tr>
                    {['Description', 'Qty', 'Unit Price (₹)', ''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <input className="seal-input" placeholder="Description" value={item.description}
                          onChange={e => { const a = [...items]; a[i].description = e.target.value; setItems(a); }} />
                      </td>
                      <td style={{ padding: '6px 8px', width: 70 }}>
                        <input type="number" min="0.01" step="0.01" className="seal-input text-center"
                          value={item.quantity} onChange={e => { const a = [...items]; a[i].quantity = e.target.value; setItems(a); }} />
                      </td>
                      <td style={{ padding: '6px 8px', width: 120 }}>
                        <input type="number" min="0" step="0.01" className="seal-input" placeholder="0.00"
                          value={item.unitPrice} onChange={e => { const a = [...items]; a[i].unitPrice = e.target.value; setItems(a); }} />
                      </td>
                      <td style={{ padding: '6px 8px', width: 32 }}>
                        <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))}
                          style={{ color: '#ccc', fontSize: 16 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => setItems([...items, { description: '', quantity: 1, unitPrice: '' }])}
                style={{ padding: '8px 12px', fontSize: 13, color: '#e57373', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}>
                + Add item
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, color: '#888' }}>Total</p>
            <p style={{ fontSize: 22, fontWeight: 800 }}>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>

          <div>
            <label className="seal-label">Notes</label>
            <textarea className="seal-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-black flex-1">{loading ? 'Saving...' : isEdit ? 'Update' : 'Create Bill'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BillDetailModal({ billId, workspaceId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['bill-detail', billId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/bills/${billId}`).then(r => r.data),
  });

  const { bill, items } = data || {};

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #eee' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{bill?.bill_number}</p>
            <p style={{ fontSize: 13, color: '#888' }}>{bill?.client}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {bill?.status && <span className={`status-${bill.status}`}>{bill.status}</span>}
            <button onClick={onClose}><X style={{ width: 18, height: 18, color: '#999' }} /></button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-red-400 mx-auto" />
          </div>
        ) : (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20, fontSize: 13 }}>
              {bill?.product_name && <div><p style={{ color: '#999' }}>Product</p><p style={{ fontWeight: 600 }}>{bill.product_name}</p></div>}
              {bill?.due_date && <div><p style={{ color: '#999' }}>Due Date</p><p style={{ fontWeight: 600 }}>{new Date(bill.due_date).toLocaleDateString('en-IN')}</p></div>}
              <div><p style={{ color: '#999' }}>Created</p><p style={{ fontWeight: 600 }}>{new Date(bill?.created_at).toLocaleDateString('en-IN')}</p></div>
            </div>

            <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f5f5f5' }}>
                  <tr>
                    {['Description', 'Qty', 'Unit Price', 'Total'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 12px', fontSize: 14 }}>{item.description}</td>
                      <td style={{ padding: '10px 12px', fontSize: 14, color: '#666' }}>{item.quantity}</td>
                      <td style={{ padding: '10px 12px', fontSize: 14, color: '#666' }}>₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600 }}>₹{parseFloat(item.total).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ borderTop: '2px solid #e0e0e0', background: '#f5f5f5' }}>
                  <tr>
                    <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>Total</td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 16 }}>
                      ₹{parseFloat(bill?.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {bill?.notes && (
              <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#555' }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Notes</p>
                {bill.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Lumpsum Payment Modal ───────────────────── */
function LumpsumModal({ totalPending, workspaceId, bills, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Sort pending/overdue bills oldest first so we pay off earliest bills first
  const pendingBills = [...bills]
    .filter(b => b.status === 'sent' || b.status === 'overdue')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Preview: which bills get fully/partially paid
  const deductAmt = parseFloat(amount) || 0;
  let remaining = deductAmt;
  const preview = pendingBills.map(b => {
    const billAmt = parseFloat(b.total_amount);
    if (remaining <= 0) return { ...b, paid: 0, leftover: billAmt, fullyPaid: false };
    if (remaining >= billAmt) {
      remaining -= billAmt;
      return { ...b, paid: billAmt, leftover: 0, fullyPaid: true };
    }
    const paid = remaining;
    remaining = 0;
    return { ...b, paid, leftover: billAmt - paid, fullyPaid: false };
  });

  const handleApply = async (e) => {
    e.preventDefault();
    if (deductAmt <= 0) return toast.error('Enter a valid amount');
    if (deductAmt > parseFloat(totalPending || 0))
      return toast.error('Amount exceeds total pending');

    setLoading(true);
    try {
      for (const b of preview) {
        if (b.paid <= 0) continue;

        if (b.fullyPaid) {
          // Mark fully covered bills as paid, store amount_paid = total_amount
          await api.put(`/workspaces/${workspaceId}/bills/${b.id}`, {
            status: 'paid',
            amountPaid: parseFloat(b.total_amount),
            notes: b.notes
              ? `${b.notes} | Lumpsum: ${note}`
              : `Lumpsum payment${note ? ': ' + note : ''}`,
          });
        } else {
          // Store partial payment amount — this is what fixes the pending calculation
          await api.put(`/workspaces/${workspaceId}/bills/${b.id}`, {
            amountPaid: parseFloat(b.paid),
            notes: b.notes
              ? `${b.notes} | Partial payment ₹${b.paid.toLocaleString('en-IN')}${note ? ': ' + note : ''}`
              : `Partial payment ₹${b.paid.toLocaleString('en-IN')}${note ? ': ' + note : ''}`,
          });
        }
      }
      await api.post(`/workspaces/${workspaceId}/payments`, {
        amount: deductAmt,
        note: note ? `Lumpsum payment: ${note}` : 'Lumpsum payment received',
      });
      toast.success(`₹${deductAmt.toLocaleString('en-IN')} applied to pending bills`);
      onDone();
      onClose();
    } catch { toast.error('Error applying payment'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #eee' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Lumpsum Payment</p>
            <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>
              Total pending: <strong style={{ color: '#1976d2' }}>₹{parseFloat(totalPending || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>
          <button onClick={onClose}><X style={{ width: 18, height: 18, color: '#999' }} /></button>
        </div>

        <form onSubmit={handleApply} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="seal-label">Amount Received (₹) *</label>
            <input
              type="number" min="1" step="0.01" required
              className="seal-input"
              placeholder="e.g. 50000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ fontSize: 18, fontWeight: 700 }}
            />
          </div>

          <div>
            <label className="seal-label">Note / Reference (optional)</label>
            <input className="seal-input" placeholder="e.g. UPI ref 123456" value={note}
              onChange={e => setNote(e.target.value)} />
          </div>

          {/* Preview of how amount gets applied */}
          {deductAmt > 0 && pendingBills.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8 }}>
                📋 Payment will be applied to these bills (oldest first):
              </p>
              <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f5f5f5' }}>
                    <tr>
                      {['Bill #', 'Client', 'Amount', 'Applied', 'Result'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', fontSize: 12, fontWeight: 600, color: '#777', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(b => (
                      <tr key={b.id} style={{
                        borderTop: '1px solid #f0f0f0',
                        background: b.fullyPaid ? '#f1f8e9' : b.paid > 0 ? '#fff8e1' : '#fff'
                      }}>
                        <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>{b.bill_number}</td>
                        <td style={{ padding: '8px 10px', fontSize: 13 }}>{b.client}</td>
                        <td style={{ padding: '8px 10px', fontSize: 13 }}>₹{parseFloat(b.total_amount).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600, color: b.paid > 0 ? '#388e3c' : '#bbb' }}>
                          {b.paid > 0 ? `₹${b.paid.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {b.fullyPaid
                            ? <span className="status-paid">Paid ✓</span>
                            : b.paid > 0
                              ? <span className="status-pending">Partial</span>
                              : <span style={{ fontSize: 12, color: '#bbb' }}>Unchanged</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pendingBills.length === 0 && (
            <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center' }}>No pending bills to apply payment to.</p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading || pendingBills.length === 0} className="btn-black flex-1">
              {loading ? 'Applying...' : 'Apply Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Billing() {
  const { activeWorkspace } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [viewBill, setViewBill] = useState(null);
  const [showLumpsum, setShowLumpsum] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', activeWorkspace?.id, search, statusFilter],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/bills`, {
      params: { status: statusFilter, client: search },
    }).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  // Fetch all bills (unfiltered) for lumpsum preview
  const { data: allBillsData } = useQuery({
    queryKey: ['bills-all', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/bills`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/payments`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['bills-summary', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/bills/summary`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const handleDelete = async (bill) => {
    if (!confirm(`Delete ${bill.bill_number}?`)) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/bills/${bill.id}`);
      toast.success('Deleted');
      qc.invalidateQueries(['bills', activeWorkspace.id]);
      qc.invalidateQueries(['bills-all', activeWorkspace.id]);
      qc.invalidateQueries(['bills-summary', activeWorkspace.id]);
    } catch { toast.error('Error'); }
  };

  const handleLumpsumDone = () => {
    qc.invalidateQueries(['bills', activeWorkspace.id]);
    qc.invalidateQueries(['bills-all', activeWorkspace.id]);
    qc.invalidateQueries(['bills-summary', activeWorkspace.id]);
    qc.invalidateQueries(['payments', activeWorkspace.id]);
  };

  const { total_paid, total_pending, overdue_count } = summaryData?.summary || {};
  const bills = data?.bills || [];
  const allBills = allBillsData?.bills || [];
  const payments = paymentsData?.payments || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="text-base font-semibold text-gray-800">Billing:</p>
        <button onClick={() => setShowModal(true)} className="btn-black">+ New Bill</button>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {/* Total Paid */}
        <div className="seal-card" style={{ flex: 1, borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Total Paid</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#4caf50' }}>
            ₹{parseFloat(total_paid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Pending — with Deduct button */}
        <div className="seal-card" style={{ flex: 1, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Pending</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#1976d2' }}>
                ₹{parseFloat(total_pending || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <button
              onClick={() => setShowLumpsum(true)}
              style={{
                background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8,
                padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#1565c0',
                cursor: 'pointer', marginTop: 2
              }}
            >
              + Deduct
            </button>
          </div>
        </div>

        {/* Overdue */}
        <div className="seal-card" style={{ flex: 1, borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Overdue</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#e53935' }}>{overdue_count || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input className="seal-input" placeholder="Search by client..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select className="seal-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="seal-card p-0 overflow-hidden">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['Sr.', 'Bill #', 'Client', 'Product', 'Total', 'Paid', 'Remaining', 'Due Date', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center' }}>
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-red-400 mx-auto" />
              </td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No bills yet</td></tr>
            ) : (
              bills.map((bill, i) => {
                const total     = parseFloat(bill.total_amount || 0);
                const paid      = bill.status === 'paid'
                  ? total
                  : parseFloat(bill.amount_paid || 0);
                const remaining = Math.max(0, total - paid);

                return (
                  <tr key={bill.id} style={{ background: i % 2 === 1 ? '#fef2f2' : '#fff', borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#999' }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{bill.bill_number}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{bill.client}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#666' }}>{bill.product_name || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>
                      ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: paid > 0 ? '#388e3c' : '#bbb' }}>
                      {paid > 0 ? `₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: remaining > 0 ? '#e53935' : '#388e3c' }}>
                      {remaining > 0 ? `₹${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '✓ Cleared'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#666' }}>
                      {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`status-${bill.status}`}>{bill.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewBill(bill.id)} className="btn-outline text-xs px-2 py-1">View</button>
                        <button onClick={() => setEditBill(bill)} className="btn-outline text-xs px-2 py-1">Edit</button>
                        <button onClick={() => handleDelete(bill)} className="btn-outline text-xs px-2 py-1" style={{ color: '#e53935', borderColor: '#e53935' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p className="text-base font-semibold text-gray-800">Payment Records</p>
        </div>
        <div className="seal-card p-0 overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {['Date', 'Amount', 'Notes', 'Received by'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>No payment records yet</td></tr>
              ) : (
                payments.map(payment => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{new Date(payment.created_at).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>₹{parseFloat(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{payment.note || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{payment.created_by_name || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <BillModal workspaceId={activeWorkspace.id} onClose={() => setShowModal(false)} />}
      {editBill && <BillModal bill={editBill} workspaceId={activeWorkspace.id} onClose={() => setEditBill(null)} />}
      {viewBill && <BillDetailModal billId={viewBill} workspaceId={activeWorkspace.id} onClose={() => setViewBill(null)} />}
      {showLumpsum && (
        <LumpsumModal
          totalPending={total_pending}
          workspaceId={activeWorkspace.id}
          bills={allBills}
          onClose={() => setShowLumpsum(false)}
          onDone={handleLumpsumDone}
        />
      )}
    </div>
  );
}