import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';

interface RoleRecord {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
}

export function RolesView() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = user?.permissions?.some(
    (p) => p.module_name === 'core.roles' && p.action === 'view',
  );

  useEffect(() => {
    let mounted = true;
    if (!canView) {
      if (mounted)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
      return;
    }

    setLoading(true);
    fetch('/api/roles')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch roles');
        return res.json();
      })
      .then((data) => {
        if (mounted) setRoles(data.data);
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [canView]);

  if (!canView) {
    return (
      <div className="uiap-view-panel">
        <div className="uiap-empty">You do not have permission to view roles.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading roles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="uiap-view-panel">
        <div className="uiap-empty" style={{ color: 'var(--uiap-danger)' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="uiap-view-panel">
      <div className="uiap-view-header">
        <h2>Roles Management</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="uiap-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>System Role</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td>{r.description}</td>
                <td>
                  {r.is_system ? (
                    <span className="uiap-badge uiap-badge-warning">System</span>
                  ) : (
                    <span className="uiap-badge uiap-badge-muted">Custom</span>
                  )}
                </td>
                <td>{r.permissions.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
