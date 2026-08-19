import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  ChevronDown,
  User,
  Shield,
  Settings,
  LogOut,
  Palette,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  onMobileMenuToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const {
    activeTab,
    setActiveTab,
    themeSettings,
    updateThemeSettings,
    userRole,
    setUserRole,
    currentUser,
    notifications,
    markNotificationRead,
    setIsCustomizerOpen,
    setIsCommandPaletteOpen,
    logout,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read);

  const titleMap: Record<string, string> = {
    dashboard: 'System Overview & Dashboard',
    students: 'Student Directory & Management',
    teachers: 'Faculty & Teacher Directory',
    classes: 'Academic Classes & Sections',
    subjects: 'Course Curriculum & Subjects',
    attendance: 'Daily Attendance Entry',
    calendar: 'Student Attendance Calendar',
    student_profile: 'Detailed Student Profile',
    reports: 'Attendance Reports & Exports',
    analytics: 'Advanced Attendance Analytics',
    notifications: 'Notification Center',
    settings: 'System Configuration & Settings',
  };

  const currentTitle = titleMap[activeTab] || 'Attendance Platform';

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    setIsRoleMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 transition-colors">
      {/* Left: Mobile Menu + Breadcrumb/Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            {currentTitle}
          </h1>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span>UIAP Portal</span>
            <span>/</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">{activeTab.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Middle: Global Search Trigger */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all text-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search students, faculty, subjects, or jump to view...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions (Role Switcher, Theme, Notifications, Profile) */}
      <div className="flex items-center gap-2.5">
        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
            title="Switch View Mode (Admin/Teacher/Student)"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="capitalize hidden sm:inline">Role: {userRole}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in duration-100">
              <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Simulate View Mode
              </div>
              {[
                { role: 'admin', label: 'Administrator', desc: 'Full System Access' },
                { role: 'teacher', label: 'Faculty / Teacher', desc: 'Take & Edit Attendance' },
                { role: 'student', label: 'Student View', desc: 'Read-only Calendar & Stats' },
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => handleRoleChange(item.role as UserRole)}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex flex-col ${
                    userRole === item.role ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-400">{item.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Customizer Drawer Button */}
        <button
          onClick={() => setIsCustomizerOpen(true)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Customize Theme & Palette"
        >
          <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </button>

        {/* Theme Toggle (Light/Dark) */}
        <button
          onClick={() =>
            updateThemeSettings({ mode: themeSettings.mode === 'dark' ? 'light' : 'dark' })
          }
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Light / Dark Mode"
        >
          {themeSettings.mode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Notification Icon */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-ping" />
            )}
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100">Notifications</span>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All ({notifications.length})
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto my-1">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">No notifications</p>
                ) : (
                  notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer rounded-lg transition-colors ${
                        !n.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                      <span className="text-[9px] text-slate-400 mt-1 block">{n.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <img
              src={currentUser.photo}
              alt={currentUser.name}
              className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/30"
            />
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[120px]">
                {currentUser.roleTitle}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in duration-100">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400">{currentUser.email}</p>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-500" />
                  <span>System Preferences</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
