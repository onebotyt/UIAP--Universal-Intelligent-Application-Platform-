import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';

interface ModuleRecord {
  id: string;
  version: string;
  is_enabled: boolean;
  installed_versions: string[];
  installed_at: string;
  updated_at: string;
  manifest: unknown;
}

export function ModulesView() {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const canView = user?.permissions?.some(
    (p) => p.module_name === 'core.modules' && p.action === 'view',
  );
  const canManage = user?.permissions?.some(
    (p) => p.module_name === 'core.modules' && p.action === 'manage',
  );

  useEffect(() => {
    let mounted = true;
    if (canView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      fetch('/api/modules')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch modules');
          return res.json();
        })
        .then((data) => {
          if (mounted) setModules(data.data);
        })
        .catch((err) => {
          if (mounted) setError((err as Error).message);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      if (mounted) setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [canView]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('package', file);

    setUploading(true);

    setError('');
    try {
      const res = await fetch('/api/modules/install', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to install module');

      const listRes = await fetch('/api/modules');
      const listData = await listRes.json();
      setModules(listData.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleUpdateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('package', file);

    setUploading(true);

    setError('');
    try {
      const res = await fetch('/api/modules/update', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update module');

      const listRes = await fetch('/api/modules');
      const listData = await listRes.json();
      setModules(listData.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRollback = async (moduleId: string, version: string) => {
    setError('');
    try {
      const res = await fetch(`/api/modules/${moduleId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rollback module');

      const listRes = await fetch('/api/modules');
      const listData = await listRes.json();
      setModules(listData.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleToggleEnable = async (mod: ModuleRecord) => {
    setError('');
    const action = mod.is_enabled ? 'disable' : 'enable';
    try {
      const res = await fetch(`/api/modules/${mod.id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} module`);

      const listRes = await fetch('/api/modules');
      const listData = await listRes.json();
      setModules(listData.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  if (!canView) {
    return (
      <div className="uiap-view-panel">
        <div className="uiap-empty">You do not have permission to view modules.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading modules...
      </div>
    );
  }

  return (
    <div className="uiap-view-panel">
      <div className="uiap-view-header">
        <h2>Modules Management</h2>
        {canManage && (
          <div>
            <label className="uiap-btn uiap-btn-primary">
              {uploading ? 'Installing...' : 'Install Package'}
              <input
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="uiap-login-error" style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="uiap-table">
          <thead>
            <tr>
              <th>Module ID</th>
              <th>Name</th>
              <th>Version</th>
              <th>Status</th>
              <th>Installed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {modules.length === 0 ? (
              <tr>
                <td colSpan={6} className="uiap-empty" style={{ padding: '2rem' }}>
                  No modules installed.
                </td>
              </tr>
            ) : (
              modules.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.id}</strong>
                  </td>
                  <td>{((m.manifest as Record<string, unknown>)?.name as string) || m.id}</td>
                  <td>
                    <span className="counter">{m.version}</span>
                  </td>
                  <td>
                    {m.is_enabled ? (
                      <span className="uiap-badge uiap-badge-success">Enabled</span>
                    ) : (
                      <span className="uiap-badge uiap-badge-muted">Disabled</span>
                    )}
                  </td>
                  <td>{new Date(m.installed_at).toLocaleDateString()}</td>
                  <td>
                    {canManage && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          className="uiap-btn uiap-btn-outline uiap-btn-sm"
                          onClick={() => handleToggleEnable(m)}
                        >
                          {m.is_enabled ? 'Disable' : 'Enable'}
                        </button>

                        <label className="uiap-btn uiap-btn-outline uiap-btn-sm">
                          Update
                          <input
                            type="file"
                            accept=".zip"
                            style={{ display: 'none' }}
                            onChange={(e) => handleUpdateUpload(e)}
                            disabled={uploading}
                          />
                        </label>

                        {m.installed_versions && m.installed_versions.length > 1 && (
                          <select
                            value={m.version}
                            onChange={(e) => {
                              if (e.target.value !== m.version)
                                handleRollback(m.id, e.target.value);
                            }}
                            style={{
                              padding: '0.2rem 0.5rem',
                              background: 'var(--uiap-bg)',
                              color: 'var(--uiap-text)',
                              border: '1px solid var(--uiap-border)',
                              borderRadius: 'var(--uiap-radius-xs)',
                            }}
                          >
                            {m.installed_versions.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
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
