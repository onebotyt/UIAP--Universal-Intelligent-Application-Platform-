import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginForm } from './components/LoginForm';
import { SetupWizard } from './components/SetupWizard';
import { AppShell } from './shell/AppShell';
import { useState, useEffect } from 'react';

// Views
import { DashboardView } from './views/DashboardView';
import { ProfileView } from './views/ProfileView';
import { UsersView } from './components/UsersView';
import { RolesView } from './components/RolesView';
import { DevicesView } from './views/DevicesView';
import { ModulesView } from './components/ModulesView';
import { BackupsView } from './views/BackupsView';
import { EventsView } from './views/EventsView';
import { ModuleView } from './views/ModuleView';
import { NotFoundView } from './views/NotFoundView';
import { CloudView } from './views/CloudView';

import './index.css';
import './App.css';

/**
 * Main application router inside the AuthProvider.
 * Checks setup status first, then auth state.
 *
 * Flow:
 *   1. Check /api/setup/status
 *   2. If setupRequired → show SetupWizard
 *   3. Else if not logged in → show LoginForm
 *   4. Else → show AppShell with routes
 */
function AppRouter() {
  const { user, loading } = useAuth();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [setupChecked, setSetupChecked] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/setup/status');
        if (res.ok) {
          const data = await res.json();
          setSetupRequired(data.setupRequired === true);
        } else {
          setSetupRequired(false);
        }
      } catch {
        // If setup endpoint is unreachable, skip setup check
        setSetupRequired(false);
      } finally {
        setSetupChecked(true);
      }
    }
    checkSetup();
  }, [user]); // Re-check after user changes (e.g. after setup completes)

  if (!setupChecked || loading) {
    return (
      <div className="uiap-loading">
        <div className="uiap-spinner" /> Loading UIAP...
      </div>
    );
  }

  if (setupRequired) {
    return <SetupWizard />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          {/* Core Routes */}
          <Route index element={<DashboardView />} />
          <Route path="profile" element={<ProfileView />} />
          <Route path="users" element={<UsersView />} />
          <Route path="roles" element={<RolesView />} />
          <Route path="devices" element={<DevicesView />} />
          <Route path="modules" element={<ModulesView />} />
          <Route path="backups" element={<BackupsView />} />
          <Route path="events" element={<EventsView />} />
          <Route path="cloud" element={<CloudView />} />

          {/* Dynamic Module Routes */}
          <Route path="m/:moduleId/*" element={<ModuleView />} />

          {/* 404 */}
          <Route path="404" element={<NotFoundView />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
