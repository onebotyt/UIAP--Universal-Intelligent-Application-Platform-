import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, LogOut, Settings, BarChart2, UserCircle } from 'lucide-react';
import { ModulesView } from './ModulesView';
import { OrganizationsView } from './OrganizationsView';
import { TransactionsView } from './TransactionsView';
import { ProfileView } from './ProfileView';
import { AnalyticsView } from './AnalyticsView';

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('uiap_token');
    const storedUser = localStorage.getItem('uiap_user');
    
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'admin') {
      navigate('/login');
      return;
    }
    
    setUser(parsedUser);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('uiap_token');
    localStorage.removeItem('uiap_user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="dashboard-app">
      <div className="dash-topbar">
        <div className="dash-brand">
          <div className="brand-mark">U</div>
          <div className="brand-name">UIAP Cloud</div>
          <div className="brand-sub">control tower</div>
        </div>
        <div className="dash-top-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--dash-text)' }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--dash-border)' }} />
            ) : (
              <UserCircle size={24} color="var(--dash-text-muted)" />
            )}
            <span className="dash-who" style={{ color: 'var(--dash-text)', fontWeight: 500 }}>{user.email}</span>
          </div>
          <button className="dash-btn-ghost" onClick={handleLogout}>
            <LogOut size={16} style={{ marginRight: '6px' }} />
            Sign out
          </button>
        </div>
      </div>

      <div className="dash-layout">
        <div className="dash-sidebar">
          <Link to="/dashboard" className={`dash-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Modules</span>
          </Link>
          <Link to="/dashboard/organizations" className={`dash-nav-item ${location.pathname === '/dashboard/organizations' ? 'active' : ''}`}>
            <Users size={18} />
            <span>Organizations</span>
          </Link>
          <Link to="/dashboard/transactions" className={`dash-nav-item ${location.pathname === '/dashboard/transactions' ? 'active' : ''}`}>
            <CreditCard size={18} />
            <span>Transactions</span>
          </Link>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to="/dashboard/analytics" className={`dash-nav-item ${location.pathname === '/dashboard/analytics' ? 'active' : ''}`}>
              <BarChart2 size={18} />
              <span>Analytics</span>
            </Link>
            <Link to="/dashboard/profile" className={`dash-nav-item ${location.pathname === '/dashboard/profile' ? 'active' : ''}`}>
              <Settings size={18} />
              <span>Profile Settings</span>
            </Link>
          </div>
        </div>

        <div className="dash-main">
          <Routes>
            <Route path="/" element={<ModulesView />} />
            <Route path="/organizations" element={<OrganizationsView />} />
            <Route path="/transactions" element={<TransactionsView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
