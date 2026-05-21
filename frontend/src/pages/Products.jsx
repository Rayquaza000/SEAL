import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { X, Upload } from 'lucide-react';

const STATUS_OPTS = ['pending', 'in_progress', 'completed'];

/* ── Save-as-Template mini modal ─────────────── */
function SaveTemplateModal({ productId, workspaceId, onClose }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Template name required');
    setLoading(true);
    try {
      await api.post(`/workspaces/${workspaceId}/products/${productId}/save-template`, {
        templateName: name, description
      });
      toast.success('Saved as template! View it in the Templates tab.');
      qc.invalidateQueries(['templates', workspaceId]);
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <p className="font-semibold mb-1" style={{ fontSize: 15 }}>Save as Process Template</p>
        <p style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>
          This product's stages will be saved and reusable for future products.
        </p>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label className="seal-label">Template Name *</label>
            <input className="seal-input" required value={name}
              onChange={e => setName(e.target.value)} placeholder="e.g. Wooden Chair Process" />
          </div>
          <div>
            <label className="seal-label">Description (optional)</label>
            <input className="seal-input" value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Brief description..." />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-black flex-1">
              {loading ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── New Product Panel (matches slide 5) ──────── */
function NewProductPanel({ workspaceId, members, templates, onCreated, onClose }) {
  const [form, setForm] = useState({ name: '', client: '', assignedTo: '', rawMaterial: '' });
  const [stages, setStages] = useState([{ name: '', assignedTo: '' }]);
  const [conceptImage, setConceptImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTplId, setSelectedTplId] = useState('');
  const [templatePreview, setTemplatePreview] = useState(null); // stages of selected template
  const [loadingTpl, setLoadingTpl] = useState(false);

  const handleTemplateSelect = async (tplId) => {
    setSelectedTplId(tplId);
    if (!tplId) {
      setStages([{ name: '', assignedTo: '' }]);
      setTemplatePreview(null);
      return;
    }
    setLoadingTpl(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/templates/${tplId}`);
      setStages(data.stages.map(s => ({ name: s.name, assignedTo: '' })));
      setTemplatePreview(data.stages);
    } catch { toast.error('Failed to load template'); }
    finally { setLoadingTpl(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validStages = stages.filter(s => s.name.trim());
    if (!validStages.length) return toast.error('Add at least one stage');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      if (form.client) fd.append('client', form.client);
      if (form.assignedTo) fd.append('assignedTo', form.assignedTo);
      fd.append('stages', JSON.stringify(validStages));
      if (conceptImage) fd.append('conceptImage', conceptImage);
      await api.post(`/workspaces/${workspaceId}/products`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Product created!');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 400 }}>
      {/* Left: product fields */}
      <form id="new-product-form" onSubmit={handleSubmit} style={{ flex: 1, paddingRight: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p className="text-base font-semibold text-gray-800">New Product:</p>
          <button type="button" onClick={onClose} style={{ color: '#999', fontSize: 18 }}>✕</button>
        </div>

        {/* Template select with preview */}
        <div style={{ marginBottom: 14 }}>
          <label className="seal-label">Use Process Template</label>
          <select
            className="seal-select w-full"
            value={selectedTplId}
            onChange={e => handleTemplateSelect(e.target.value)}
          >
            <option value="">— Start from scratch —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.stage_count} stages)
              </option>
            ))}
          </select>

          {/* Template preview box */}
          {loadingTpl && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8, fontSize: 13, color: '#aaa' }}>
              Loading template...
            </div>
          )}
          {templatePreview && !loadingTpl && (
            <div style={{ marginTop: 8, padding: '10px 12px', background: '#fce4ec', borderRadius: 8, border: '1px solid #f48fb1' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#e57373', marginBottom: 6 }}>
                📋 Template stages ({templatePreview.length}) — will be added to right panel:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {templatePreview.map((s, i) => (
                  <span key={s.id} style={{
                    background: '#fff', border: '1px solid #f48fb1', borderRadius: 20,
                    padding: '2px 8px', fontSize: 12, color: '#555'
                  }}>
                    {i + 1}. {s.name}
                  </span>
                ))}
              </div>
              <button type="button" onClick={() => { setSelectedTplId(''); setStages([{ name: '', assignedTo: '' }]); setTemplatePreview(null); }}
                style={{ marginTop: 8, fontSize: 11, color: '#e57373', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ✕ Clear template
              </button>
            </div>
          )}
        </div>

        <p style={{ fontSize: 14, color: '#555', marginBottom: 12 }}>Product ID: <strong>Auto</strong></p>

        <div style={{ marginBottom: 10 }}>
          <label className="seal-label">Product Name:</label>
          <input className="seal-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>

        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label className="seal-label" style={{ minWidth: 100, marginBottom: 0 }}>Assign to:</label>
          <select className="seal-select flex-1" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
            <option value="">Select Employee</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label className="seal-label" style={{ minWidth: 100, marginBottom: 0 }}>Product concept image:</label>
          <label className="btn-outline cursor-pointer flex items-center gap-1 text-xs">
            <Upload style={{ width: 13, height: 13 }} />
            {conceptImage ? conceptImage.name : 'Upload image'}
            <input type="file" className="hidden" accept="image/*" onChange={e => setConceptImage(e.target.files[0])} />
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label className="seal-label">Client:</label>
          <input className="seal-input" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label className="seal-label">Allocate Raw material:</label>
          <input className="seal-input" value={form.rawMaterial} onChange={e => setForm({ ...form, rawMaterial: e.target.value })} placeholder="Material name" />
        </div>
      </form>

      {/* Divider */}
      <div className="v-divider" />

      {/* Right: stages */}
      <div style={{ flex: 1, paddingLeft: 24 }}>
        <p className="text-base font-semibold text-gray-800 mb-4">Stages:</p>

        {stages.map((stage, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="seal-label" style={{ minWidth: 90, marginBottom: 0 }}>Stage Name:</label>
              <input
                className="seal-input flex-1"
                value={stage.name}
                onChange={e => { const s = [...stages]; s[i].name = e.target.value; setStages(s); }}
                placeholder={`Stage ${i + 1}`}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="seal-label" style={{ minWidth: 90, marginBottom: 0 }}>Assign to:</label>
              <select
                className="seal-select flex-1"
                value={stage.assignedTo}
                onChange={e => { const s = [...stages]; s[i].assignedTo = e.target.value; setStages(s); }}
              >
                <option value="">Select Employee</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {stages.length > 1 && (
                <button type="button" onClick={() => setStages(stages.filter((_, j) => j !== i))}
                  style={{ color: '#aaa', fontSize: 16, marginLeft: 4 }}>✕</button>
              )}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="submit" form="new-product-form" disabled={loading} className="btn-black">
            {loading ? 'Saving...' : 'save'}
          </button>
          <button
            type="button"
            onClick={() => setStages([...stages, { name: '', assignedTo: '' }])}
            className="btn-outline"
          >
            +create new stage
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Panel (matches slide 4 right panel) ── */
function DetailPanel({ product, stages, materials, workspaceId, members, onUpdated, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    client: product.client || '',
    assignedTo: product.assigned_to || '',
    notes: product.notes || '',
  });
  // Editable stages state for update
  const [editStages, setEditStages] = useState(() => stages.map(s => ({ name: s.name, assignedTo: s.assigned_to || '' })));
  const [buildImage, setBuildImage] = useState(null);
  const [showTplModal, setShowTplModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validStages = editStages.filter(s => s.name.trim());
      if (!validStages.length) {
        toast.error('Add at least one stage');
        setLoading(false);
        return;
      }
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (buildImage) fd.append('buildImage', buildImage);
      fd.append('stages', JSON.stringify(validStages));
      await api.put(`/workspaces/${workspaceId}/products/${product.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Updated');
      setEditing(false);
      onUpdated();
    } catch (err) { toast.error('Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/products/${product.id}`);
      toast.success('Deleted');
      onDelete();
    } catch (err) { toast.error('Error'); }
  };

  const pct = stages.length
    ? Math.round(100 * stages.filter(s => s.status === 'completed').length / stages.length) : 0;

  return (
    <div style={{ flex: 1, paddingLeft: 24 }}>
      <p className="text-base font-semibold text-gray-800 mb-4">Details:</p>

      {!editing ? (
        <>
          <div style={{ lineHeight: 2, fontSize: 14, color: '#333' }}>
            <p><strong>{product.name}</strong></p>
            <p>Product Id: {product.product_code}</p>
            {product.concept_image_url && (
              <p>Product Concept Image: <a href={product.concept_image_url} target="_blank" rel="noreferrer" style={{ color: '#e57373', textDecoration: 'underline' }}>View</a></p>
            )}
            {!product.concept_image_url && <p>Product Concept Image: —</p>}
            {product.build_image_url && (
              <p>Product Build Image: <a href={product.build_image_url} target="_blank" rel="noreferrer" style={{ color: '#e57373', textDecoration: 'underline' }}>View</a></p>
            )}
            {!product.build_image_url && <p>Product Build Image: —</p>}
            <p>Client: {product.client || '—'}</p>
            <p>Raw material: {materials.map(m => m.material_name).join(', ') || '—'}</p>
            <p>Assigned to: {product.assigned_to_name || '—'}</p>
            <p>Status: <span className={`status-${product.status}`}>{product.status?.replace('_', ' ')}</span></p>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 14, marginBottom: 4 }}>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>Progress: {pct}%</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Stages list */}
          {stages.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Stages:</p>
              {stages.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: '#444' }}>#{s.stage_order} {s.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.assigned_to_name && <span style={{ color: '#888', fontSize: 12 }}>{s.assigned_to_name}</span>}
                    <span className={`status-${s.status}`}>{s.status?.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setEditing(true)} className="btn-yellow" style={{ background: '#ffe082', borderColor: '#ffe082', color: '#7c5c00' }}>Update Details</button>
            <button onClick={() => setShowTplModal(true)} className="btn-outline text-sm">Save as Template</button>
            <button onClick={handleDelete} className="btn-outline text-sm" style={{ color: '#e53935', borderColor: '#e53935' }}>Delete</button>
          </div>
        </>
      ) : (
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label className="seal-label">Product Name</label>
            <input className="seal-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="seal-label">Client</label>
            <input className="seal-input" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} />
          </div>
          <div>
            <label className="seal-label">Assigned To</label>
            <select className="seal-select w-full" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="seal-label">Build Image</label>
            <label className="btn-outline cursor-pointer inline-flex items-center gap-1 text-xs">
              <Upload style={{ width: 13, height: 13 }} />
              {buildImage ? buildImage.name : 'Upload build image'}
              <input type="file" className="hidden" accept="image/*" onChange={e => setBuildImage(e.target.files[0])} />
            </label>
          </div>
          <div>
            <label className="seal-label">Notes</label>
            <textarea className="seal-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          {/* Editable stages */}
          <div style={{ marginTop: 18 }}>
            <label className="seal-label" style={{ fontWeight: 600, fontSize: 15 }}>Stages</label>
            {editStages.map((stage, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="seal-label" style={{ minWidth: 90, marginBottom: 0 }}>Stage Name:</label>
                  <input
                    className="seal-input flex-1"
                    value={stage.name}
                    onChange={e => { const s = [...editStages]; s[i].name = e.target.value; setEditStages(s); }}
                    placeholder={`Stage ${i + 1}`}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="seal-label" style={{ minWidth: 90, marginBottom: 0 }}>Assign to:</label>
                  <select
                    className="seal-select flex-1"
                    value={stage.assignedTo}
                    onChange={e => { const s = [...editStages]; s[i].assignedTo = e.target.value; setEditStages(s); }}
                  >
                    <option value="">Select Employee</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  {editStages.length > 1 && (
                    <button type="button" onClick={() => setEditStages(editStages.filter((_, j) => j !== i))}
                      style={{ color: '#aaa', fontSize: 16, marginLeft: 4 }}>✕</button>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setEditStages([...editStages, { name: '', assignedTo: '' }])}
                className="btn-outline"
              >
                + Add stage
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={() => setEditing(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-yellow flex-1">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}

      {showTplModal && (
        <SaveTemplateModal productId={product.id} workspaceId={workspaceId} onClose={() => setShowTplModal(false)} />
      )}
    </div>
  );
}

/* ── Main Products Page ───────────────────────── */
export default function Products() {
  const { activeWorkspace, isOwner } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { productId } = useParams();
  const [selectedId, setSelectedId] = useState(productId || null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['products', activeWorkspace?.id, search, filterStatus],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/products`, {
      params: { search, status: filterStatus },
    }).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const { data: productDetail } = useQuery({
    queryKey: ['product', selectedId],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/products/${selectedId}`).then(r => r.data),
    enabled: !!selectedId,
  });

  const { data: membersData } = useQuery({
    queryKey: ['employees', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/employees`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/templates`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const products = productsData?.products || [];
  const members = membersData?.members || [];
  const templates = templatesData?.templates || [];

  useEffect(() => {
    setSelectedId(productId || null);
  }, [productId]);

  // Derive unique clients from loaded products for the client filter dropdown
  const uniqueClients = [...new Set(products.map(p => p.client).filter(Boolean))].sort();

  // Apply client + employee filters client-side (search + status are server-side)
  const filteredProducts = products.filter(p => {
    if (filterClient && p.client !== filterClient) return false;
    if (filterEmployee && String(p.assigned_to) !== filterEmployee) return false;
    return true;
  });

  const handleCreated = () => {
    setShowNew(false);
    refetch();
    qc.invalidateQueries(['dashboard', activeWorkspace.id]);
  };

  const handleDeleted = () => {
    setSelectedId(null);
    navigate('/products');
    refetch();
    qc.invalidateQueries(['dashboard', activeWorkspace.id]);
  };

  if (showNew && isOwner) {
    return (
      <NewProductPanel
        workspaceId={activeWorkspace.id}
        members={members}
        templates={templates}
        onCreated={handleCreated}
        onClose={() => setShowNew(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 140px)' }}>

      {/* ── LEFT: Product list ─────────────────── */}
      <div style={{ width: 400, paddingRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p className="text-base font-semibold text-gray-800">
            Products: <span style={{ fontWeight: 400, fontSize: 13, color: '#aaa' }}>({filteredProducts.length})</span>
          </p>
          {isOwner && (
            <button onClick={() => setShowNew(true)} className="btn-black text-xs px-3 py-1">
              + New Product
            </button>
          )}
        </div>

        {/* Search */}
        <input
          className="seal-input mb-2"
          placeholder="Search by name, ID, client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {/* Status filter */}
          <select
            className="seal-select"
            style={{ flex: 1, fontSize: 12 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Client filter */}
          <select
            className="seal-select"
            style={{ flex: 1, fontSize: 12 }}
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
          >
            <option value="">All clients</option>
            {uniqueClients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Employee filter */}
          <select
            className="seal-select"
            style={{ flex: 1, fontSize: 12 }}
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
          >
            <option value="">All employees</option>
            <option value="null">Unassigned</option>
            {members.map(m => (
              <option key={m.id} value={String(m.id)}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Clear filters */}
        {(filterStatus || filterClient || filterEmployee || search) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterClient(''); setFilterEmployee(''); }}
            style={{ fontSize: 11, color: '#e57373', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0', fontWeight: 600 }}
          >
            ✕ Clear all filters
          </button>
        )}

        <div className="seal-card p-0 overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {['Sr.', 'ID', 'Product', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center' }}>
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-red-400 mx-auto" />
                </td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>
                  {products.length > 0 ? 'No products match filters' : 'No products yet'}
                </td></tr>
              ) : (
                filteredProducts.map((p, i) => {
                  const isSelected = selectedId === String(p.id);
                  const bg = isSelected ? '#fecdd3' : i % 2 === 1 ? '#fef2f2' : '#fff';
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedId(String(p.id));
                        navigate(`/products/${p.id}`);
                      }}
                      style={{ background: bg, cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                    >
                      <td style={{ padding: '9px 10px', fontSize: 13, color: '#999' }}>{i + 1}</td>
                      <td style={{ padding: '9px 10px', fontSize: 12, color: '#888' }}>{p.product_code}</td>
                      <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: isSelected ? 700 : 500 }}>
                        <div>{p.name}</div>
                        {p.client && <div style={{ fontSize: 11, color: '#aaa' }}>{p.client}</div>}
                        {p.assigned_to_name && <div style={{ fontSize: 11, color: '#bbb' }}>👤 {p.assigned_to_name}</div>}
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span className={`status-${p.status}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                          {p.status?.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── VERTICAL DIVIDER ─────────────────── */}
      <div className="v-divider" />

      {/* ── RIGHT: Detail panel ───────────────── */}
      {selectedId && productDetail ? (
        <DetailPanel
          product={productDetail.product}
          stages={productDetail.stages || []}
          materials={productDetail.materials || []}
          workspaceId={activeWorkspace.id}
          members={members}
          onUpdated={() => { refetch(); qc.invalidateQueries(['product', selectedId]); }}
          onDelete={handleDeleted}
        />
      ) : (
        <div style={{ flex: 1, paddingLeft: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#aaa', fontSize: 14 }}>Select a product to view details</p>
        </div>
      )}
    </div>
  );
}