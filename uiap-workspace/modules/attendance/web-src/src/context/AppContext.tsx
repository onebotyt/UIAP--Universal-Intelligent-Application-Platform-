import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

interface AppContextType {
  students: any[];
  attendanceRecords: any[];
  toasts: ToastMessage[];
  currentUser: any;
  userRole: string;

  addToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;

  refreshData: () => Promise<void>;

  markAttendanceBatch: (records: any[]) => Promise<void>;
  addSingleAttendanceRecord: (record: any) => Promise<void>;
  updateSingleAttendance: (id: string, status: AttendanceStatus) => Promise<void>;
  deleteAttendanceRecord: (id: string) => Promise<void>;
  deleteAttendanceBatch: (ids: string[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const currentUser = { name: 'Admin', role: 'admin' };
  const userRole = 'admin';

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Helper to fetch from a specific module
  const fetchModuleApi = async (module: string, endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`/api/m/${module}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
        ...options.headers,
      }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API Error');
    return data.data;
  };

  const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    return fetchModuleApi('uiap.attendance', endpoint, options);
  };

  const refreshData = async () => {
    try {
      const [s, records] = await Promise.all([
        fetchModuleApi('uiap.college-management', '/students'),
        fetchApi('/records'),
      ]);
      setStudents(s);
      
      // The attendance api doesn't return student names, let's map them from students
      const mappedRecords = records.map((r: any) => {
        const student = s.find((st: any) => st.studentId === r.studentId || st.id === r.studentId);
        return {
          ...r,
          studentName: student ? student.name : `Unknown (${r.studentId})`
        };
      });

      setAttendanceRecords(mappedRecords);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const markAttendanceBatch = async (records: any[]) => {
    try {
      await fetchApi('/records/batch', { method: 'POST', body: JSON.stringify({ records }) });
      await refreshData();
      addToast('Roll call saved successfully', 'success');
    } catch(e: any) { addToast(e.message, 'error'); }
  };

  const addSingleAttendanceRecord = async (record: any) => {
    try {
      await fetchApi('/records', { method: 'POST', body: JSON.stringify(record) });
      await refreshData();
      addToast('Attendance record created', 'success');
    } catch(e: any) { addToast(e.message, 'error'); }
  };

  const updateSingleAttendance = async (id: string, status: AttendanceStatus) => {
    try {
      await fetchApi(`/records/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      await refreshData();
      addToast('Status updated', 'success');
    } catch(e: any) { addToast(e.message, 'error'); }
  };

  const deleteAttendanceRecord = async (id: string) => {
    try {
      await fetchApi(`/records/${id}`, { method: 'DELETE' });
      await refreshData();
      addToast('Record deleted', 'warning');
    } catch(e: any) { addToast(e.message, 'error'); }
  };

  const deleteAttendanceBatch = async (ids: string[]) => {
    try {
      await fetchApi('/records', { method: 'DELETE', body: JSON.stringify({ ids }) });
      await refreshData();
      addToast('Records deleted', 'warning');
    } catch(e: any) { addToast(e.message, 'error'); }
  };

  return (
    <AppContext.Provider
      value={{
        students,
        attendanceRecords,
        toasts,
        currentUser,
        userRole,
        addToast,
        removeToast,
        refreshData,
        markAttendanceBatch,
        addSingleAttendanceRecord,
        updateSingleAttendance,
        deleteAttendanceRecord,
        deleteAttendanceBatch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
