import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

interface EventRecord {
  id: string;
  type: string;
  source: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  payload: unknown;
  error_details: unknown;
  created_at: string;
}

export function EventsView() {
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = hasPermission('events', 'view');

  useEffect(() => {
    let mounted = true;
    if (!canView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch('/api/events')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch events');
        return res.json();
      })
      .then((data) => {
        if (mounted) setEvents(data.data);
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
        <div className="uiap-empty">You do not have permission to view events.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading events...
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
        <h2>Event Inbox</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="uiap-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Source</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="uiap-empty" style={{ padding: '2rem' }}>
                  No events found.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="counter">{e.id.substring(0, 8)}...</span>
                  </td>
                  <td>
                    <strong>{e.type}</strong>
                  </td>
                  <td>{e.source}</td>
                  <td>
                    {e.status === 'PROCESSED' && (
                      <span className="uiap-badge uiap-badge-success">Processed</span>
                    )}
                    {e.status === 'FAILED' && (
                      <span className="uiap-badge uiap-badge-danger">Failed</span>
                    )}
                    {e.status === 'PENDING' && (
                      <span className="uiap-badge uiap-badge-warning">Pending</span>
                    )}
                  </td>
                  <td>{new Date(e.created_at).toLocaleString()}</td>
                  <td>
                    {Boolean(e.error_details) && (
                      <span style={{ color: 'var(--uiap-danger)', fontSize: '0.8rem' }}>
                        Error occurred
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
