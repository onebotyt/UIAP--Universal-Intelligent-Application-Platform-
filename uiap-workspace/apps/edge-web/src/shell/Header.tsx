import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

interface HeaderProps {
  pageTitle: string;
  onToggleSidebar: () => void;
}

export function Header({ pageTitle, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '??';

  return (
    <header className="uiap-header">
      <div className="uiap-header-left">
        <button className="uiap-hamburger" onClick={onToggleSidebar} aria-label="Toggle navigation">
          ☰
        </button>
        <span className="uiap-page-title">{pageTitle}</span>
      </div>
      <div className="uiap-header-right">
        <Link to="/profile" className="uiap-user-badge" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="uiap-user-avatar" style={{ overflow: 'hidden' }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <span>{user?.username ?? 'User'}</span>
        </Link>
        <button className="uiap-logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
