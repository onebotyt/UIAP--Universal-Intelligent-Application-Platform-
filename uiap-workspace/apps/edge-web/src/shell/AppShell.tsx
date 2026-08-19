import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, type ModuleNavItem } from './Sidebar';
import { Header } from './Header';

/** Module record from the API. */
interface ModuleRecord {
  id: string;
  is_enabled: boolean;
  manifest: {
    id: string;
    name?: string;
    ui?: {
      navItem?: string;
      entry?: string;
      navigation?: Array<{
        id: string;
        label: string;
        icon?: string;
        requiredPermission?: { module: string; action: string };
      }>;
    };
  };
}

/** Maps the module list API response into navigation items. */
function buildModuleNavItems(modules: ModuleRecord[]): ModuleNavItem[] {
  const items: ModuleNavItem[] = [];

  for (const mod of modules) {
    if (!mod.is_enabled || !mod.manifest?.ui) continue;

    const ui = mod.manifest.ui;

    // New navigation array format
    if (ui.navigation && ui.navigation.length > 0) {
      for (const nav of ui.navigation) {
        items.push({
          id: nav.id,
          label: nav.label,
          icon: nav.icon || '🧩',
          path: `/m/${mod.id}`,
          requiredPermission: nav.requiredPermission,
        });
      }
    }
    // Legacy navItem format
    else if (ui.navItem) {
      items.push({
        id: mod.id,
        label: ui.navItem,
        icon: '🧩',
        path: `/m/${mod.id}`,
      });
    }
  }

  return items;
}

/** Route path → page title map. */
function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/m/')) return 'Module';
  const segment = pathname.slice(1);
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moduleNavItems, setModuleNavItems] = useState<ModuleNavItem[]>([]);
  const location = useLocation();

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/modules');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          setModuleNavItems(buildModuleNavItems(data.data));
        }
      }
    } catch {
      // Silently fail — modules section just won't show
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchModules();
  }, [fetchModules]);

  // Re-fetch modules when navigating to the modules management page
  // (in case user just enabled/disabled a module)
  useEffect(() => {
    if (location.pathname === '/modules') {
      const timer = setTimeout(fetchModules, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, fetchModules]);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="uiap-layout">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        moduleNavItems={moduleNavItems}
      />
      <div className="uiap-content-area">
        <Header pageTitle={pageTitle} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <main className="uiap-main">
          <Outlet context={{ refreshModuleNav: fetchModules }} />
        </main>
      </div>
    </div>
  );
}
