import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function MyTasks() {
  const { activeWorkspace } = useAuth();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-tasks', activeWorkspace?.id],
    queryFn: () => api.get(`/workspaces/${activeWorkspace.id}/my-tasks`).then(r => r.data),
    enabled: !!activeWorkspace?.id,
  });

  const tasks = data?.tasks || [];
  // Flatten: one row per stage, plus product-level rows
  const rows = tasks.map((t, i) => ({ ...t, srNo: i + 1 }));

  const handleStatusChange = async (task, newStatus) => {
    if (task.task_type !== 'stage') return;
    setUpdating(task.id);
    try {
      await api.put(`/workspaces/${activeWorkspace.id}/stages/${task.id}/status`, { status: newStatus });
      toast.success('Status updated');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <p className="text-base font-semibold text-gray-800 mb-5">My Tasks:</p>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-red-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-gray-400 text-sm mt-8 text-center">No tasks assigned to you yet.</p>
      ) : (
        <div className="seal-card overflow-hidden p-0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {['Sr. No.', 'ProductID', 'Product', 'Stage', 'Status', 'Assigned Task'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#555', borderBottom: '1px solid #e0e0e0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.id}-${row.task_type}`} style={{ background: 'white', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#555' }}>{i + 1}.</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{row.product_code}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700 }}>{row.product_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>
                    {row.task_type === 'stage' ? row.stage_name : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.task_type === 'stage' ? (
                      <select
                        className={`status-${row.status}`}
                        value={row.status}
                        disabled={updating === row.id}
                        onChange={e => handleStatusChange(row, e.target.value)}
                        style={{ border: 'none', cursor: 'pointer', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 600 }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    ) : (
                      <span className={`status-${row.status}`}>{row.status?.replace('_', ' ')}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#555' }}>{row.task_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
