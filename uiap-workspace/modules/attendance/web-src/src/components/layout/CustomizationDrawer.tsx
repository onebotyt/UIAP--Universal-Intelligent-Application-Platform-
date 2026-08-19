import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sun, Moon, Palette, LayoutGrid, Sparkles, Check } from 'lucide-react';

export const CustomizationDrawer: React.FC = () => {
  const { isCustomizerOpen, setIsCustomizerOpen, themeSettings, updateThemeSettings } = useApp();

  if (!isCustomizerOpen) return null;

  const primaryColors = [
    { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600' },
    { id: 'purple', name: 'Royal Purple', bg: 'bg-purple-600' },
    { id: 'blue', name: 'Ocean Blue', bg: 'bg-blue-600' },
    { id: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-600' },
    { id: 'rose', name: 'Rose Red', bg: 'bg-rose-600' },
    { id: 'amber', name: 'Warm Amber', bg: 'bg-amber-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Theme & UI Customizer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personalize your UIAP workspace</p>
            </div>
          </div>
          <button
            onClick={() => setIsCustomizerOpen(false)}
            className="p-1.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Light / Dark Mode */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Color Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateThemeSettings({ mode: 'light' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  themeSettings.mode === 'light'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode</span>
              </button>

              <button
                onClick={() => updateThemeSettings({ mode: 'dark' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  themeSettings.mode === 'dark'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          {/* Primary Color Palette */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Primary Accent Color
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {primaryColors.map((color) => {
                const isSelected = themeSettings.primaryColor === color.id;
                return (
                  <button
                    key={color.id}
                    onClick={() => updateThemeSettings({ primaryColor: color.id })}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white ring-2 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${color.bg} flex-shrink-0 flex items-center justify-center text-white`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 text-[11px] truncate">{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Style */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Sidebar Layout
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'expanded', label: 'Expanded (Full)' },
                { id: 'compact', label: 'Compact (Icons)' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => updateThemeSettings({ sidebarStyle: style.id as any })}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                    themeSettings.sidebarStyle === style.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Layout Density */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Layout Spacing & Density
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'comfortable', label: 'Comfortable (Spacious)' },
                { id: 'compact', label: 'Compact (High Density)' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => updateThemeSettings({ density: d.id as any })}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                    themeSettings.density === d.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Card Corner Radius
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'sm', label: '4px' },
                { id: 'md', label: '8px' },
                { id: 'lg', label: '12px' },
                { id: 'xl', label: '16px' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => updateThemeSettings({ borderRadius: r.id as any })}
                  className={`py-2 rounded-xl border text-xs font-medium text-center transition-all ${
                    themeSettings.borderRadius === r.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => setIsCustomizerOpen(false)}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/20"
          >
            Apply & Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
