import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { StudentsView } from './components/views/StudentsView';
import { TeachersView } from './components/views/TeachersView';
import { ClassesView } from './components/views/ClassesView';
import { ToastContainer } from './components/common/Toast';
import { Users, GraduationCap, School, BookOpen } from 'lucide-react';

const ModuleLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'departments' | 'classes' | 'teachers' | 'students'>('departments');

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      {/* Internal Module Nav */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
        <h1 className="text-2xl font-bold mb-4">College Management</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'departments' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            <School size={18} /> Departments
          </button>
          <button 
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'classes' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            <BookOpen size={18} /> Classes
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'teachers' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            <Users size={18} /> Teachers
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'students' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            <GraduationCap size={18} /> Students
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'departments' && <div>Departments view coming soon...</div>}
        {activeTab === 'classes' && <ClassesView />}
        {activeTab === 'teachers' && <TeachersView />}
        {activeTab === 'students' && <StudentsView />}
      </main>

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ModuleLayout />
    </AppProvider>
  );
}
