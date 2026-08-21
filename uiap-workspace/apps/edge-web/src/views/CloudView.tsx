import { useState, useEffect } from 'react';

interface Entitlement {
  slug: string;
  version: string | null;
  status: string;
}

interface CloudStatus {
  configured: boolean;
  cloudUrl: string | null;
  entitlements: Entitlement[];
}

export function CloudView() {
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/cloud/status');
      if (!res.ok) throw new Error('Failed to fetch cloud status');
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cloud status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading && !status) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading cloud status...
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 5px 0' }}>Cloud Sync</h1>
          <p style={{ margin: 0, color: 'var(--uiap-text-muted)' }}>
            Manage connection to the UIAP Developer Cloud
          </p>
        </div>
        <button className="uiap-btn" onClick={fetchStatus}>
          Refresh Status
        </button>
      </div>

      {error && (
        <div
          className="uiap-view-panel"
          style={{ color: 'var(--uiap-danger)', borderColor: 'var(--uiap-danger)' }}
        >
          {error}
        </div>
      )}

      <div className="uiap-view-panel" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Connection Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <strong style={{ width: '120px' }}>Status:</strong>
            {status?.configured ? (
              <span style={{ color: 'var(--uiap-success)' }}>● Configured</span>
            ) : (
              <span style={{ color: 'var(--uiap-warning)' }}>● Not Configured</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <strong style={{ width: '120px' }}>Cloud URL:</strong>
            <span style={{ color: 'var(--uiap-text-muted)', fontFamily: 'monospace' }}>
              {status?.cloudUrl || 'Not set'}
            </span>
          </div>

          {!status?.configured && (
            <p style={{ color: 'var(--uiap-text-muted)', fontSize: '0.9em', marginTop: '10px' }}>
              To connect this Edge installation to the cloud, configure UIAP_CLOUD_URL and
              UIAP_INSTALL_KEY in your environment or .env file.
            </p>
          )}
        </div>
      </div>

      {status?.configured && (
        <div className="uiap-view-panel" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Cloud Entitlements</h3>
          {status.entitlements.length === 0 ? (
            <p style={{ color: 'var(--uiap-text-muted)', textAlign: 'center' }}>
              No modules are currently licensed to this installation.
            </p>
          ) : (
            <table
              className="uiap-table"
              style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--uiap-border)' }}>
                  <th style={{ paddingBottom: '10px' }}>Module Slug</th>
                  <th style={{ paddingBottom: '10px' }}>Licensed Version</th>
                  <th style={{ paddingBottom: '10px' }}>License Status</th>
                </tr>
              </thead>
              <tbody>
                {status.entitlements.map((ent) => (
                  <tr key={ent.slug} style={{ borderBottom: '1px solid var(--uiap-border)' }}>
                    <td style={{ padding: '10px 0', fontFamily: 'monospace' }}>{ent.slug}</td>
                    <td
                      style={{
                        padding: '10px 0',
                        color: 'var(--uiap-text-muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      v{ent.version || 'unknown'}
                    </td>
                    <td style={{ padding: '10px 0' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8em',
                          border: '1px solid',
                          borderColor:
                            ent.status === 'active'
                              ? 'var(--uiap-success)'
                              : 'var(--uiap-text-muted)',
                          color:
                            ent.status === 'active'
                              ? 'var(--uiap-success)'
                              : 'var(--uiap-text-muted)',
                        }}
                      >
                        {ent.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {status?.configured && (
        <div className="uiap-view-panel">
          <h3 style={{ marginTop: 0 }}>Module Sync Settings (Hybrid Mode)</h3>
          <table
            className="uiap-table"
            style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--uiap-border)' }}>
                <th style={{ paddingBottom: '10px' }}>Module Slug</th>
                <th style={{ paddingBottom: '10px' }}>Execution Scope</th>
                <th style={{ paddingBottom: '10px' }}>Sync Protocol</th>
              </tr>
            </thead>
            <tbody>
              {status.entitlements.map((ent) => (
                <tr
                  key={ent.slug + '-sync'}
                  style={{ borderBottom: '1px solid var(--uiap-border)' }}
                >
                  <td style={{ padding: '10px 0', fontFamily: 'monospace' }}>{ent.slug}</td>
                  <td style={{ padding: '10px 0' }}>
                    <select className="uiap-input" style={{ width: 'auto', padding: '4px 8px' }}>
                      <option value="both">Run on Both (Synced)</option>
                      <option value="local">Run on Local Only</option>
                      <option value="cloud">Run on Cloud Only</option>
                    </select>
                  </td>
                  <td
                    style={{
                      padding: '10px 0',
                      color: ent.status === 'active' ? 'var(--uiap-success)' : 'var(--uiap-danger)',
                    }}
                  >
                    {ent.status === 'active' ? '● WebSocket Active' : 'Offline'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
