import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';

interface UserRecord {
  id: string;
  username: string;
  is_active: boolean;
  roles: string[];
}

export function UsersView() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = user?.permissions?.some(
    (p) => p.module_name === 'core.users' && p.action === 'view',
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
    fetch('/api/users')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      })
      .then((data) => {
        if (mounted) setUsers(data.data);
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
        <div className="uiap-empty">You do not have permission to view users.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading users...
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
        <h2>Users Management</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="uiap-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Status</th>
              <th>Roles Count</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.username}</strong>
                </td>
                <td>
                  {u.is_active ? (
                    <span className="uiap-badge uiap-badge-success">Active</span>
                  ) : (
                    <span className="uiap-badge uiap-badge-danger">Inactive</span>
                  )}
                </td>
                <td>{u.roles.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
