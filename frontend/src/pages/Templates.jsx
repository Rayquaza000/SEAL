import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

/* ── Create Template Modal ───────────────────── */
function CreateTemplateModal({ workspaceId, onClose }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState(['']);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validStages = stages.filter(s => s.trim());
    if (!validStages.length) return toast.error('Add at least one stage');
    setLoading(true);
    try {
      await api.post(`/workspaces/${workspaceId}/templates`, {
        name, description, stages: validStages,
      });
      toast.success('Template created!');
      qc.invalidateQueries(['templates', workspaceId]);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating template');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #eee' }}>
          <p style={{ fontWeight: 700, fontSize: 16 }}>Create Process Template</p>
          <button onClick={onClose}><X style={{ width: 18, height: 18, color: '#999' }} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="seal-label">Template Name *</label>
            <input className="seal-input" required value={name}
              onChange={e => setName(e.target.value)} placeholder="e.g. Wooden Furniture Process" />
          </div>
          <div>
            <label className="seal-label">Description</label>
            <textarea className="seal-input" rows={2} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Optional description..." />
          </div>

          <div>
            <label className="seal-label">Stages (in order)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stages.map((stage, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: '#f5f5f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#aaa', flexShrink: 0
                  }}>{i + 1}</div>
                  <input
                    className="seal-input"
                    placeholder={`Stage ${i + 1} name`}
                    value={stage}
                    onChange={e => {
                      const s = [...stages]; s[i] = e.target.value; setStages(s);
                    }}
                  />
                  {stages.length > 1 && (
                    <button type="button" onClick={() => setStages(stages.filter((_, j) => j !== i))}
                      style={{ color: '#ccc', fontSize: 18, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button"
                onClick={() => setStages([...stages, ''])}
                style={{ alignSelf: 'flex-start', color: '#e57373', fontWeight: 600, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                + Add stage
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-black flex-1">
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Template Detail Panel ───────────────────── */
function TemplateDetail({ template, workspaceId, onDelete, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['template-detail', template.id],
    queryFn: () => api.get(`/workspaces/${workspaceId}/templates/${template.id}`).then(r => r.data),
  });

  const handleDelete = async () => {
    if (!confirm(`Delete template "${template.name}"? This won't affect existing products.`)) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/templates/${template.id}`);
      toast.success('Template deleted');
      onDelete();
    } catch { toast.error('Error deleting template'); }
  };

  const stages = data?.stages || [];

  return (
    <div style={{ flex: 1, paddingLeft: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{template.name}</p>
          {template.description && (
            <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{template.description}</p>
          )}
          <p style={{ fontSize: 12, color: '#bbb' }}>
            Created by {template.created_by_name} · {new Date(template.created_at).toLocaleDateString('en-IN')}
          </p>
        </div>
        <button onClick={onClose} style={{ color: '#ccc', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 12 }}>✕</button>
      </div>

      {/* Stage count badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fce4ec', borderRadius: 20, padding: '4px 12px', marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e57373' }}>{template.stage_count} stages</span>
      </div>

      {/* Stages list */}
      {isLoading ? (
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 mx-auto" style={{ borderColor: '#e57373' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {stages.map((stage, i) => (
            <div key={stage.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#f9f9f9', borderRadius: 10, padding: '10px 14px'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#e57373',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0
              }}>{stage.stage_order}</div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{stage.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* How to use info box */}
      <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#f57f17', marginBottom: 4 }}>💡 How to use this template</p>
        <p style={{ fontSize: 13, color: '#666' }}>
          When creating a new product, select <strong>"{template.name}"</strong> from the "Use Template" dropdown.
          All {template.stage_count} stages will be automatically added — you can then assign employees to each stage.
        </p>
      </div>

      <button onClick={handleDelete}
        className="btn-outline"
        style={{ color: '#e53935', borderColor: '#e53935', fontSize: 13 }}>
        Delete Template
      </button>
    </div>
  );
}

/* ── Main Templates Page ─────────────────────── */
export default function Templates() {
  const { activeWorkspace } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['templates', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/templates`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const templates = data?.templates || [];

  const handleDeleted = () => {
    setSelectedTemplate(null);
    refetch();
    qc.invalidateQueries(['templates', activeWorkspace.id]);
  };

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 140px)' }}>

      {/* ── LEFT: Template list ────────────────── */}
      <div style={{ width: 380, paddingRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p className="text-base font-semibold text-gray-800">Process Templates:</p>
          <button onClick={() => setShowCreate(true)} className="btn-black text-xs px-3 py-1">
            + Create Template
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div className="animate-spin rounded-full h-7 w-7 border-t-2 mx-auto" style={{ borderColor: '#e57373' }} />
          </div>
        ) : templates.length === 0 ? (
          <div className="seal-card" style={{ textAlign: 'center', padding: 32, borderRadius: 16 }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>📋</p>
            <p style={{ fontWeight: 600, fontSize: 14, color: '#555', marginBottom: 6 }}>No templates yet</p>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
              Save a product's stages as a template, or create one from scratch.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-black text-xs px-4 py-2">
              + Create First Template
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map((tpl, i) => {
              const isSelected = selectedTemplate?.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: isSelected ? '#fce4ec' : i % 2 === 1 ? '#fef2f2' : '#fff',
                    border: isSelected ? '1.5px solid #e57373' : '1px solid transparent',
                    borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#333' }}>{tpl.name}</p>
                    <span style={{
                      background: '#e57373', color: '#fff', borderRadius: 20,
                      padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 8
                    }}>
                      {tpl.stage_count} stages
                    </span>
                  </div>
                  {tpl.description && (
                    <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{tpl.description}</p>
                  )}
                  <p style={{ fontSize: 11, color: '#bbb' }}>
                    By {tpl.created_by_name} · {new Date(tpl.created_at).toLocaleDateString('en-IN')}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── VERTICAL DIVIDER ──────────────────── */}
      <div className="v-divider" />

      {/* ── RIGHT: Detail panel ───────────────── */}
      {selectedTemplate ? (
        <TemplateDetail
          template={selectedTemplate}
          workspaceId={activeWorkspace.id}
          onDelete={handleDeleted}
          onClose={() => setSelectedTemplate(null)}
        />
      ) : (
        <div style={{ flex: 1, paddingLeft: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📋</p>
            <p style={{ color: '#bbb', fontSize: 14 }}>Select a template to view its stages</p>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateTemplateModal
          workspaceId={activeWorkspace.id}
          onClose={() => { setShowCreate(false); refetch(); }}
        />
      )}
    </div>
  );
}
