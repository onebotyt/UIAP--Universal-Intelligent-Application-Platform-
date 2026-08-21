import { useState, useEffect } from 'react';

interface Stats {
  core: string;
  database: string;
  modules: { enabled: number; total: number };
  devices: { total: number };
  events: { failed: number; pending: number };
}

export function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch('/api/dashboard/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard stats');
        return res.json();
      })
      .then((data) => {
        if (mounted) setStats(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Check for OTA updates
    fetch('/api/system/update')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.success && data.updateAvailable) {
          setUpdateInfo(data);
        }
      })
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, []);

  const applyUpdate = async () => {
    if (
      !window.confirm(
        `Are you sure you want to install version ${updateInfo.version}? The system will restart automatically.`,
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/system/update/apply', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to start update');
      // Show "Restarting..." UI
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="uiap-view-panel">
        <div className="uiap-empty">
          <p style={{ color: 'var(--uiap-danger)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isUpdating && (
        <div
          className="uiap-view-panel"
          style={{ marginBottom: '1.5rem', background: 'var(--uiap-primary)', color: 'white' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="uiap-spinner" style={{ borderTopColor: 'white' }} />
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0' }}>Downloading & Installing Update...</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Please wait. The system will automatically restart when complete.
              </p>
            </div>
          </div>
        </div>
      )}
      {!isUpdating && updateInfo && (
        <div
          className="uiap-view-panel"
          style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--uiap-primary)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0' }}>
                🚀 Update Available: v{updateInfo.version}
              </h3>
              <p style={{ margin: 0, color: 'var(--uiap-text-muted)' }}>
                A new version of UIAP Edge is available for installation.
              </p>
            </div>
            <button className="uiap-btn uiap-btn-primary" onClick={applyUpdate}>
              Install Update
            </button>
          </div>
        </div>
      )}

      <div className="uiap-stats-grid">
        <div className="uiap-stat-card">
          <div className="uiap-stat-icon">🟢</div>
          <div className="uiap-stat-label">Core Status</div>
          <div className="uiap-stat-value">{stats?.core === 'running' ? 'Online' : 'Offline'}</div>
        </div>

        <div className="uiap-stat-card">
          <div className="uiap-stat-icon">🗄️</div>
          <div className="uiap-stat-label">Database</div>
          <div className="uiap-stat-value">
            {stats?.database === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="uiap-stat-card">
          <div className="uiap-stat-icon">📦</div>
          <div className="uiap-stat-label">Modules</div>
          <div className="uiap-stat-value">
            {stats?.modules.enabled} / {stats?.modules.total} Active
          </div>
        </div>

        <div className="uiap-stat-card">
          <div className="uiap-stat-icon">📡</div>
          <div className="uiap-stat-label">Devices</div>
          <div className="uiap-stat-value">{stats?.devices.total} Registered</div>
        </div>

        <div className="uiap-stat-card">
          <div className="uiap-stat-icon">⚡</div>
          <div className="uiap-stat-label">Events</div>
          <div className="uiap-stat-value">
            {stats?.events.pending} Pending
            {stats?.events.failed ? ` (${stats.events.failed} Failed)` : ''}
          </div>
        </div>
      </div>

      <div className="uiap-view-panel">
        <div className="uiap-empty">
          <h3>Welcome to UIAP Edge</h3>
          <p>Select a module from the sidebar to get started.</p>
        </div>
      </div>
    </div>
  );
}
