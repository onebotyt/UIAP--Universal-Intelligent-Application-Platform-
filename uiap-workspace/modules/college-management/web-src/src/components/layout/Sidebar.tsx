import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Palette,
  ShieldCheck,
  Building2,
  CheckSquare,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const {
    activeTab,
    setActiveTab,
    notifications,
    themeSettings,
    updateThemeSettings,
    setIsCustomizerOpen,
    logout,
    userRole,
    systemSettings,
  } = useApp();

  const isCompact = themeSettings.sidebarStyle === 'compact';
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'classes', label: 'Classes', icon: Building2 },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'attendance', label: 'Take Attendance', icon: CheckSquare, badge: 'Live' },
    { id: 'calendar', label: 'Attendance Calendar', icon: Calendar },
    { id: 'student_profile', label: 'Student Profile', icon: UserCheck },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadNotifCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id as ActiveTab);
    setIsMobileOpen(false);
  };

  const toggleCompact = () => {
    updateThemeSettings({
      sidebarStyle: isCompact ? 'expanded' : 'compact',
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-100 border-r border-slate-800/80 transition-all duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCompact ? 'w-20' : 'w-64'}`}
      >
        {/* Logo & Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20 text-white flex-shrink-0">
              U
            </div>
            {!isCompact && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-200 truncate">
                  UIAP Attendance
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
                  Enterprise v3.4
                </span>
              </div>
            )}
          </div>

          <button
            onClick={toggleCompact}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCompact ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Role Badge */}
        {!isCompact && (
          <div className="mx-3 my-2.5 p-2 rounded-xl bg-indigo-950/50 border border-indigo-800/40 flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Logged in Mode</p>
              <p className="font-bold text-indigo-300 capitalize truncate">{userRole} Portal</p>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-xs transition-colors relative group ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                } ${isCompact ? 'justify-center px-0 border-l-0' : ''}`}
                title={isCompact ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 flex-shrink-0 ${
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'
                  }`}
                />

                {!isCompact && <span className="truncate flex-1 text-left">{item.label}</span>}

                {!isCompact && item.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}

                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-indigo-900' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 transition-colors ${
              isCompact ? 'justify-center px-0' : ''
            }`}
            title="Open Live Theme Customizer"
          >
            <Palette className="w-4 h-4 text-purple-400 flex-shrink-0" />
            {!isCompact && <span>Theme Customizer</span>}
          </button>

          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors ${
              isCompact ? 'justify-center px-0' : ''
            }`}
            title="Logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCompact && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
