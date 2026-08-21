import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { branding } from '../config/branding';

/** Module record shape from GET /api/modules */
export interface ModuleNavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  requiredPermission?: { module: string; action: string };
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  moduleNavItems: ModuleNavItem[];
}

/** Core navigation items with their required permissions. */
const coreNavItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/users', icon: '👤', label: 'Users', perm: { module: 'core.users', action: 'view' } },
  { path: '/roles', icon: '🛡️', label: 'Roles', perm: { module: 'core.roles', action: 'view' } },
  { path: '/devices', icon: '📡', label: 'Devices', perm: { module: 'devices', action: 'view' } },
  {
    path: '/modules',
    icon: '📦',
    label: 'Modules',
    perm: { module: 'core.modules', action: 'view' },
  },
  { path: '/backups', icon: '💾', label: 'Backups', perm: { module: 'backup', action: 'view' } },
  { path: '/events', icon: '⚡', label: 'Events', perm: { module: 'events', action: 'view' } },
  {
    path: '/cloud',
    icon: '☁️',
    label: 'Cloud Sync',
    perm: { module: 'core.modules', action: 'manage' },
  },
];

export function Sidebar({ open, onClose, moduleNavItems }: SidebarProps) {
  const { hasPermission } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      <div className={`uiap-sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />

      <aside className={`uiap-sidebar ${open ? 'open' : ''}`}>
        {/* Brand */}
        <div className="uiap-sidebar-brand">
          <div className="uiap-sidebar-logo">◆</div>
          <div className="uiap-sidebar-brand-text">
            <h1>{branding.applicationName}</h1>
            <span>{branding.applicationFullName}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="uiap-sidebar-nav">
          {/* Core section */}
          <div className="uiap-nav-section">
            <div className="uiap-nav-section-label">Core</div>
            {coreNavItems.map((item) => {
              // Permission check — Dashboard is always visible
              if (item.perm && !hasPermission(item.perm.module, item.perm.action)) {
                return null;
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `uiap-nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="uiap-nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          {/* Modules section — only shown if there are module nav items */}
          {moduleNavItems.length > 0 && (
            <div className="uiap-nav-section">
              <div className="uiap-nav-section-label">Modules</div>
              {moduleNavItems.map((item) => {
                if (
                  item.requiredPermission &&
                  !hasPermission(item.requiredPermission.module, item.requiredPermission.action)
                ) {
                  return null;
                }
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `uiap-nav-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <span className="uiap-nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
