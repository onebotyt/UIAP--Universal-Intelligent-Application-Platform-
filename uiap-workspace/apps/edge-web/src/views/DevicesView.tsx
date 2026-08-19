import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

interface DeviceRecord {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNREGISTERED';
  ip_address: string;
  last_seen: string | null;
  module_id: string;
  created_at: string;
}

export function DevicesView() {
  const { hasPermission } = useAuth();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = hasPermission('devices', 'view');

  useEffect(() => {
    let mounted = true;
    if (!canView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch('/api/devices')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch devices');
        return res.json();
      })
      .then((data) => {
        if (mounted) setDevices(data.data);
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
        <div className="uiap-empty">You do not have permission to view devices.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading devices...
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
        <h2>Device Registry</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="uiap-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Module</th>
              <th>IP Address</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="uiap-empty" style={{ padding: '2rem' }}>
                  No devices registered.
                </td>
              </tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="counter">{d.id.substring(0, 8)}...</span>
                  </td>
                  <td>
                    <strong>{d.name}</strong>
                  </td>
                  <td>
                    {d.status === 'ONLINE' && (
                      <span className="uiap-badge uiap-badge-success">Online</span>
                    )}
                    {d.status === 'OFFLINE' && (
                      <span className="uiap-badge uiap-badge-danger">Offline</span>
                    )}
                    {d.status === 'UNREGISTERED' && (
                      <span className="uiap-badge uiap-badge-muted">Unregistered</span>
                    )}
                  </td>
                  <td>{d.module_id}</td>
                  <td>
                    <span className="counter">{d.ip_address}</span>
                  </td>
                  <td>{d.last_seen ? new Date(d.last_seen).toLocaleString() : 'Never'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
