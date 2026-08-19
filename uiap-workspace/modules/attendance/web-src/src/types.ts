export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface Student {
  id: string;
  studentId: string;
  name: string;
  photo: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  className: string;
  section: string;
  department: string;
  enrollmentDate: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  overallAttendance: number;
}

export interface Teacher {
  id: string;
  teacherId: string;
  name: string;
  photo: string;
  email: string;
  phone: string;
  department: string;
  qualification: string;
  assignedClasses: string[];
  assignedSubjects: string[];
  status: 'Active' | 'On Leave' | 'Inactive';
}

export interface ClassItem {
  id: string;
  name: string;
  section: string;
  academicYear: string;
  totalStudents: number;
  classTeacher: string;
  subjects: string[];
  roomNumber: string;
}

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  teacher: string;
  className: string;
  department: string;
  totalLectures: number;
  avgAttendance: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  subject: string;
  date: string;
  checkInTime: string;
  status: AttendanceStatus;
  notes?: string;
  markedBy?: string;
  method?: 'manual' | 'qr_scan' | 'qr_session' | 'batch';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'low_attendance' | 'absence' | 'system' | 'general';
  read: boolean;
  studentId?: string;
}

export interface ThemeSettings {
  mode: 'light' | 'dark';
  primaryColor: string; // e.g., 'indigo', 'purple', 'blue', 'emerald', 'rose'
  accentColor: string;
  sidebarStyle: 'expanded' | 'compact' | 'hover';
  density: 'comfortable' | 'compact';
  borderRadius: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  fontSize: 'sm' | 'md' | 'lg';
}

export interface AttendanceRules {
  minAttendancePercentage: number; // e.g. 75
  lateThresholdMinutes: number; // e.g. 15
  workingDays: string[];
  notifyParentsOnAbsence: boolean;
  autoWarningThreshold: number; // e.g. 70
}

export interface SystemSettings {
  institutionName: string;
  institutionLogo: string;
  academicYear: string;
  timezone: string;
  dateFormat: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'attendance'
  | 'calendar'
  | 'student_profile'
  | 'reports'
  | 'analytics'
  | 'notifications'
  | 'settings';
