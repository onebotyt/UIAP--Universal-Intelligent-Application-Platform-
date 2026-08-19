import { Link } from 'react-router-dom';

export function NotFoundView() {
  return (
    <div className="uiap-view-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ fontSize: '4rem', opacity: 0.5, marginBottom: '1rem' }}>404</div>
      <h2>Page Not Found</h2>
      <p style={{ color: 'var(--uiap-text-muted)', marginBottom: '2rem' }}>
        The page you are looking for does not exist or you do not have permission to view it.
      </p>
      <Link to="/" className="uiap-btn uiap-btn-primary">
        Return to Dashboard
      </Link>
    </div>
  );
}
