import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, LogOut } from 'lucide-react';
import { ModulesView } from './ModulesView';
import { OrganizationsView } from './OrganizationsView';
import { TransactionsView } from './TransactionsView';

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
          <div className="dash-who">{user.email}</div>
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
        </div>

        <div className="dash-main">
          <Routes>
            <Route path="/" element={<ModulesView />} />
            <Route path="/organizations" element={<OrganizationsView />} />
            <Route path="/transactions" element={<TransactionsView />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
