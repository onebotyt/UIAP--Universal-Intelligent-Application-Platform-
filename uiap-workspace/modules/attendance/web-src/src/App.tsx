import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AttendanceView } from './components/views/AttendanceView';
import { ToastContainer } from './components/common/Toast';
import './index.css';

const MainContent: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <AttendanceView />
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <ToastContainer />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
};

export default App;
