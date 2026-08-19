import { useAuth } from '../auth/AuthContext';

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
        <div className="uiap-user-badge">
          <div className="uiap-user-avatar">{initials}</div>
          <span>{user?.username ?? 'User'}</span>
        </div>
        <button className="uiap-logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
