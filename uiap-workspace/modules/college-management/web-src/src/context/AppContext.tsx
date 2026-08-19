import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppContextType {
  students: any[];
  teachers: any[];
  classes: any[];
  departments: any[];
  toasts: ToastMessage[];

  addToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;

  refreshData: () => Promise<void>;

  addStudent: (student: any) => Promise<void>;
  updateStudent: (id: string, updates: any) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  
  addTeacher: (teacher: any) => Promise<void>;
  updateTeacher: (id: string, updates: any) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;

  addClass: (cls: any) => Promise<void>;
  updateClass: (id: string, cls: any) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  
  setActiveTab: (tab: any) => void;
  setSelectedStudentForProfile: (student: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getAuthToken = () => {
    // In UIAP, the token is usually stored in localStorage by the Edge Web shell
    return localStorage.getItem('token') || '';
  };

  const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`/api/m/uiap.college-management${endpoint}`, {
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

  const refreshData = async () => {
    try {
      const [d, c, t, s] = await Promise.all([
        fetchApi('/departments'),
        fetchApi('/classes'),
        fetchApi('/teachers'),
        fetchApi('/students'),
      ]);
      setDepartments(d);
      setClasses(c);
      setTeachers(t);
      setStudents(s);
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addStudent = async (studentData: any) => {
    try {
      await fetchApi('/students', { method: 'POST', body: JSON.stringify(studentData) });
      await refreshData();
      addToast('Student added successfully', 'success');
    } catch(e: any) { addToast(e.message, 'error'); }
  };
  const deleteStudent = async (id: string) => {
    try {
      await fetchApi(`/students/${id}`, { method: 'DELETE' });
      await refreshData();
      addToast('Student removed', 'warning');
    } catch(e: any) { addToast(e.message, 'error'); }
  };

  const addTeacher = async (teacherData: any) => {
    try {
      await fetchApi('/teachers', { method: 'POST', body: JSON.stringify(teacherData) });
      await refreshData();
      addToast('Teacher added successfully', 'success');
    } catch(e: any) { addToast(e.message, 'error'); }
  };
  const deleteTeacher = async (id: string) => {
    try {
      await fetchApi(`/teachers/${id}`, { method: 'DELETE' });
      await refreshData();
      addToast('Teacher removed', 'warning');
    } catch(e: any) { addToast(e.message, 'error'); }
  };

  const addClass = async (clsData: any) => {
    try {
      await fetchApi('/classes', { method: 'POST', body: JSON.stringify(clsData) });
      await refreshData();
      addToast('Class created successfully', 'success');
    } catch(e: any) { addToast(e.message, 'error'); }
  };
  const deleteClass = async (id: string) => {
    try {
      await fetchApi(`/classes/${id}`, { method: 'DELETE' });
      await refreshData();
      addToast('Class deleted', 'warning');
    } catch(e: any) { addToast(e.message, 'error'); }
  };

  const updateStudent = async (id: string, updates: any) => {};
  const updateTeacher = async (id: string, updates: any) => {};
  const updateClass = async (id: string, updates: any) => {};
  const setActiveTab = (tab: any) => {};
  const setSelectedStudentForProfile = (student: any) => {};

  return (
    <AppContext.Provider
      value={{
        students,
        teachers,
        classes,
        departments,
        toasts,
        addToast,
        removeToast,
        refreshData,
        addStudent,
        updateStudent,
        deleteStudent,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addClass,
        updateClass,
        deleteClass,
        setActiveTab,
        setSelectedStudentForProfile,
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
