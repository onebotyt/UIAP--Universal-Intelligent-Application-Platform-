import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, User, GraduationCap, BookOpen, Layers, X, ArrowRight } from 'lucide-react';
import { ActiveTab } from '../../types';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    students,
    teachers,
    classes,
    subjects,
    setActiveTab,
    setSelectedStudentForProfile,
  } = useApp();

  const [query, setQuery] = useState('');

  if (!isCommandPaletteOpen) return null;

  const filteredStudents = query
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.studentId.toLowerCase().includes(query.toLowerCase())
      )
    : students.slice(0, 3);

  const filteredTeachers = query
    ? teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.department.toLowerCase().includes(query.toLowerCase())
      )
    : teachers.slice(0, 2);

  const filteredClasses = query
    ? classes.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : classes.slice(0, 2);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsCommandPaletteOpen(false);
  };

  const handleSelectStudent = (s: typeof students[0]) => {
    setSelectedStudentForProfile(s);
    setActiveTab('student_profile');
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search students, teachers, subjects, classes, or jump to view..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-base"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 space-y-3">
          {/* Quick Nav Options */}
          {!query && (
            <div className="pb-2">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 block mb-1">
                Quick Views
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Take Attendance', tab: 'attendance', icon: BookOpen },
                  { label: 'Analytics Dashboard', tab: 'analytics', icon: Layers },
                  { label: 'Attendance Calendar', tab: 'calendar', icon: BookOpen },
                  { label: 'System Reports', tab: 'reports', icon: Layers },
                ].map((item) => (
                  <button
                    key={item.tab}
                    onClick={() => handleSelectTab(item.tab as ActiveTab)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Students list */}
          {filteredStudents.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 block mb-1">
                Students
              </span>
              <div className="space-y-1">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={s.photo} alt={s.name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{s.name}</p>
                        <p className="text-[11px] text-slate-500">{s.studentId} • {s.className}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                      {s.overallAttendance}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teachers */}
          {filteredTeachers.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 block mb-1">
                Faculty & Teachers
              </span>
              <div className="space-y-1">
                {filteredTeachers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTab('teachers')}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={t.photo} alt={t.name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                        <p className="text-[11px] text-slate-500">{t.department}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">View Faculty</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Classes */}
          {filteredClasses.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 block mb-1">
                Classes
              </span>
              <div className="space-y-1">
                {filteredClasses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectTab('classes')}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{c.name} - {c.section}</p>
                        <p className="text-[11px] text-slate-500">{c.totalStudents} Students</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400">{c.roomNumber}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
