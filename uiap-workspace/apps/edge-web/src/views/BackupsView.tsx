import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

interface BackupRecord {
  id: string;
  filename: string;
  size_bytes: number;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  created_at: string;
  error_message?: string;
}

export function BackupsView() {
  const { hasPermission } = useAuth();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const canView = hasPermission('backup', 'view');
  const canManage = hasPermission('backup', 'manage');

  const fetchBackups = () => {
    fetch('/api/backups')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch backups');
        return res.json();
      })
      .then((data) => {
        setBackups(data.data);
      })
      .catch((err) => {
        setError((err as Error).message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (canView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);

      fetchBackups();
    } else {
      setLoading(false);
    }
  }, [canView]);

  const handleCreateBackup = async () => {
    if (creating) return;
    setCreating(true);

    setError('');

    try {
      const res = await fetch('/api/backups/create', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to create backup');
      }

      fetchBackups();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  if (!canView) {
    return (
      <div className="uiap-view-panel">
        <div className="uiap-empty">You do not have permission to view backups.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading backups...
      </div>
    );
  }

  return (
    <div className="uiap-view-panel">
      <div className="uiap-view-header">
        <h2>System Backups</h2>
        {canManage && (
          <button
            className="uiap-btn uiap-btn-primary"
            onClick={handleCreateBackup}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        )}
      </div>

      {error && (
        <div className="uiap-login-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="uiap-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <tr>
                <td colSpan={5} className="uiap-empty" style={{ padding: '2rem' }}>
                  No backups found.
                </td>
              </tr>
            ) : (
              backups.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.filename}</strong>
                  </td>
                  <td>{(b.size_bytes / 1024 / 1024).toFixed(2)} MB</td>
                  <td>
                    {b.status === 'COMPLETED' && (
                      <span className="uiap-badge uiap-badge-success">Completed</span>
                    )}
                    {b.status === 'FAILED' && (
                      <span className="uiap-badge uiap-badge-danger">Failed</span>
                    )}
                    {b.status === 'PENDING' && (
                      <span className="uiap-badge uiap-badge-warning">Pending</span>
                    )}
                  </td>
                  <td>{new Date(b.created_at).toLocaleString()}</td>
                  <td>
                    {b.error_message && (
                      <span style={{ color: 'var(--uiap-danger)', fontSize: '0.8rem' }}>
                        {b.error_message}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
