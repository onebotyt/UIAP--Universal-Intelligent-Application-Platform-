import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QrScannerSection } from '../common/QrScannerSection';
import {
  CheckSquare,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Save,
  RotateCcw,
  Sparkles,
  Calendar as CalendarIcon,
  BookOpen,
  Building2,
  QrCode,
  SlidersHorizontal,
  Plus,
  Trash2,
  Filter,
  UserCheck,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { AttendanceStatus } from '../../context/AppContext';

export const AttendanceView: React.FC = () => {
  const {
    students,
    attendanceRecords,
    markAttendanceBatch,
    addSingleAttendanceRecord,
    updateSingleAttendance,
    deleteAttendanceRecord,
    deleteAttendanceBatch,
    addToast,
    currentUser,
    userRole,
  } = useApp();

  // Primary Tab Mode: 'roll_call' | 'qr_terminal' | 'records_manager'
  const [activeTabMode, setActiveTabMode] = useState<'roll_call' | 'qr_terminal' | 'records_manager'>('roll_call');

  // Streamlined Faculty Mode toggle (hides non-essential clutter)
  const [isFacultyStreamlined, setIsFacultyStreamlined] = useState(true);

  // Roll Call state
  const [selectedClass, setSelectedClass] = useState('B.Tech CSE 3rd Year');
  const [selectedSection, setSelectedSection] = useState('Section A');
  const [selectedSubject, setSelectedSubject] = useState('Data Structures & Algorithms');
  const [selectedDate, setSelectedDate] = useState('2026-08-11');
  const [searchTerm, setSearchTerm] = useState('');

  // Records Manager filter state
  const [recordSearchTerm, setRecordSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Add Record Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRecordData, setNewRecordData] = useState({
    studentId: '',
    className: 'B.Tech CSE 3rd Year',
    section: 'Section A',
    subject: 'Data Structures & Algorithms',
    date: new Date().toISOString().split('T')[0],
    checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'present' as AttendanceStatus,
    notes: '',
  });

  // Class students roster for roll call
  const classStudents = students.filter(
    (s) => s.className === selectedClass && s.section === selectedSection
  );

  // Local state for temporary roll call marking
  const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>(() => {
    const initialMap: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      initialMap[st.id] = 'present';
    });
    return initialMap;
  });

  const filteredRoster = classStudents.filter(
    (st) =>
      st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Roll Call Counters
  const totalCount = classStudents.length || 1;
  const presentCount = Object.values(studentStatuses).filter((s) => s === 'present').length;
  const absentCount = Object.values(studentStatuses).filter((s) => s === 'absent').length;
  const lateCount = Object.values(studentStatuses).filter((s) => s === 'late').length;
  const leaveCount = Object.values(studentStatuses).filter((s) => s === 'leave').length;
  const percentage = Math.round(((presentCount + lateCount) / totalCount) * 100);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStudentStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      updated[st.id] = status;
    });
    setStudentStatuses(updated);
    addToast(`Marked all ${classStudents.length} students as ${status.toUpperCase()}`, 'info');
  };

  const handleReset = () => {
    handleMarkAll('present');
    addToast('Attendance sheet reset to default Present status', 'info');
  };

  const handleSave = () => {
    const records = classStudents.map((st) => ({
      studentId: st.studentId,
      studentName: st.name,
      className: selectedClass,
      section: selectedSection,
      subject: selectedSubject,
      date: selectedDate,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: studentStatuses[st.id] || 'present',
      method: 'batch' as const,
      markedBy: currentUser.name,
    }));

    markAttendanceBatch(records);
  };

  // Records Manager Logic
  const filteredRecords = attendanceRecords.filter((rec) => {
    const matchesSearch =
      rec.studentName.toLowerCase().includes(recordSearchTerm.toLowerCase()) ||
      rec.studentId.toLowerCase().includes(recordSearchTerm.toLowerCase()) ||
      rec.subject.toLowerCase().includes(recordSearchTerm.toLowerCase());

    const matchesClass = filterClass === 'ALL' || rec.className === filterClass;
    const matchesSubject = filterSubject === 'ALL' || rec.subject === filterSubject;
    const matchesStatus = filterStatus === 'ALL' || rec.status === filterStatus;

    return matchesSearch && matchesClass && matchesSubject && matchesStatus;
  });

  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRecords = () => {
    if (selectedRecordIds.length === filteredRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(filteredRecords.map((r) => r.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRecordIds.length === 0) return;
    deleteAttendanceBatch(selectedRecordIds);
    setSelectedRecordIds([]);
  };

  // Add Single Record Submission
  const handleAddRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecordData.studentId) {
      addToast('Please select or enter a student ID', 'error');
      return;
    }

    const matchedStudent = students.find((s) => s.studentId === newRecordData.studentId || s.id === newRecordData.studentId);
    const studentName = matchedStudent ? matchedStudent.name : 'Unknown Student';

    addSingleAttendanceRecord({
      studentId: newRecordData.studentId,
      studentName,
      className: newRecordData.className,
      section: newRecordData.section,
      subject: newRecordData.subject,
      date: newRecordData.date,
      checkInTime: newRecordData.checkInTime,
      status: newRecordData.status,
      notes: newRecordData.notes,
      method: 'manual',
      markedBy: currentUser.name,
    });

    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & View Mode Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Faculty Attendance Management Terminal</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record lecture roll calls, run QR check-in scanners, and manage student attendance records
          </p>
        </div>

        {/* View Mode Navigation Pill */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTabMode('roll_call')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTabMode === 'roll_call'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Class Roll Call</span>
          </button>

          <button
            onClick={() => setActiveTabMode('qr_terminal')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTabMode === 'qr_terminal'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code Terminal</span>
          </button>

          <button
            onClick={() => setActiveTabMode('records_manager')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTabMode === 'records_manager'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Manage Records ({attendanceRecords.length})</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Interactive Class Roll Call */}
      {activeTabMode === 'roll_call' && (
        <div className="space-y-6">
          {/* Selectors Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Class Batch</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="B.Tech CSE 3rd Year">B.Tech CSE 3rd Year</option>
                <option value="B.Tech ECE 2nd Year">B.Tech ECE 2nd Year</option>
                <option value="M.Tech AI 1st Year">M.Tech AI 1st Year</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Section</span>
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Subject Course</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="Data Structures & Algorithms">CS-301 Data Structures & Algorithms</option>
                <option value="Database Systems">CS-302 Database Systems</option>
                <option value="Digital Signal Processing">EC-201 Digital Signal Processing</option>
                <option value="Deep Learning & Neural Nets">AI-502 Deep Learning</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Lecture Date</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          {/* Overview Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Attendance %</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{percentage}%</span>
            </div>

            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Present Count
              </span>
              <span className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-1">{presentCount}</span>
            </div>

            <div className="bg-rose-50/80 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-800/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Absent Count
              </span>
              <span className="text-xl font-black text-rose-800 dark:text-rose-200 mt-1">{absentCount}</span>
            </div>

            <div className="bg-amber-50/80 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Late Count
              </span>
              <span className="text-xl font-black text-amber-800 dark:text-amber-200 mt-1">{lateCount}</span>
            </div>

            <div className="bg-sky-50/80 dark:bg-sky-950/40 p-3.5 rounded-2xl border border-sky-200/80 dark:border-sky-800/80 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase flex items-center gap-1">
                <CalendarOff className="w-3.5 h-3.5" /> On Leave
              </span>
              <span className="text-xl font-black text-sky-800 dark:text-sky-200 mt-1">{leaveCount}</span>
            </div>
          </div>

          {/* Roster Table with Status Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter student list..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Sheet</span>
                </button>

                <button
                  onClick={() => handleMarkAll('present')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-200 transition-colors"
                >
                  All Present
                </button>
                <button
                  onClick={() => handleMarkAll('absent')}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200 transition-colors"
                >
                  All Absent
                </button>

                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all ml-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Sheet</span>
                </button>
              </div>
            </div>

            {/* Student Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRoster.map((st, idx) => {
                const currentStatus = studentStatuses[st.id] || 'present';

                return (
                  <div
                    key={st.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-400 w-6">#{idx + 1}</span>
                      <img
                        src={st.photo}
                        alt={st.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{st.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          ID: <span className="font-mono">{st.studentId}</span> • Rate:{' '}
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {st.overallAttendance}%
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
                      <button
                        onClick={() => setStatus(st.id, 'present')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          currentStatus === 'present'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Present</span>
                      </button>

                      <button
                        onClick={() => setStatus(st.id, 'absent')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Absent</span>
                      </button>

                      <button
                        onClick={() => setStatus(st.id, 'late')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          currentStatus === 'late'
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Late</span>
                      </button>

                      <button
                        onClick={() => setStatus(st.id, 'leave')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          currentStatus === 'leave'
                            ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-2 ring-sky-500'
                            : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                        }`}
                      >
                        <CalendarOff className="w-3.5 h-3.5" />
                        <span>Leave</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: QR Code Terminal Section */}
      {activeTabMode === 'qr_terminal' && <QrScannerSection />}

      {/* MODE 3: Records Management Terminal (Add, Edit, Remove Records & Streamline View) */}
      {activeTabMode === 'records_manager' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
                <span>Faculty Attendance Records Management</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add manual attendance records, modify statuses, or remove unwanted records
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Streamline Toggle */}
              <button
                onClick={() => setIsFacultyStreamlined(!isFacultyStreamlined)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                  isFacultyStreamlined
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {isFacultyStreamlined ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isFacultyStreamlined ? 'Streamlined View' : 'Show Full Details'}</span>
              </button>

              {/* Add New Record */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Record</span>
              </button>

              {/* Delete Selected Batch */}
              {selectedRecordIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 animate-pulse transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Selected ({selectedRecordIds.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="relative">
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Search Student / Subject</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, ID..."
                  value={recordSearchTerm}
                  onChange={(e) => setRecordSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Filter Class</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium"
              >
                <option value="ALL">All Classes</option>
                <option value="B.Tech CSE 3rd Year">B.Tech CSE 3rd Year</option>
                <option value="B.Tech ECE 2nd Year">B.Tech ECE 2nd Year</option>
                <option value="M.Tech AI 1st Year">M.Tech AI 1st Year</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Filter Subject</label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium"
              >
                <option value="ALL">All Subjects</option>
                <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                <option value="Database Systems">Database Systems</option>
                <option value="Digital Signal Processing">Digital Signal Processing</option>
                <option value="Deep Learning & Neural Nets">Deep Learning</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Filter Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="leave">Leave</option>
              </select>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedRecordIds.length > 0 && selectedRecordIds.length === filteredRecords.length}
                  onChange={handleSelectAllRecords}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Showing {filteredRecords.length} of {attendanceRecords.length} records
                </span>
              </div>

              {selectedRecordIds.length > 0 && (
                <span className="text-rose-600 font-bold">{selectedRecordIds.length} records selected</span>
              )}
            </div>

            {filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <SlidersHorizontal className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">No attendance records match your filter criteria.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredRecords.map((rec) => {
                  const isSelected = selectedRecordIds.includes(rec.id);

                  return (
                    <div
                      key={rec.id}
                      className={`p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRecord(rec.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {rec.studentName}
                            </h4>
                            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                              {rec.studentId}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px] mt-0.5">
                            <span>{rec.className} ({rec.section})</span>
                            <span>•</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{rec.subject}</span>
                            <span>•</span>
                            <span>{rec.date} ({rec.checkInTime})</span>
                            {!isFacultyStreamlined && rec.markedBy && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-500">By: {rec.markedBy}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badges & Actions */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                        {/* Status Select dropdown */}
                        <select
                          value={rec.status}
                          onChange={(e) => updateSingleAttendance(rec.id, e.target.value as AttendanceStatus)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs border uppercase tracking-wider ${
                            rec.status === 'present'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                              : rec.status === 'absent'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                              : rec.status === 'late'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                              : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300'
                          }`}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="leave">Leave</option>
                        </select>

                        {/* Delete single record */}
                        <button
                          onClick={() => deleteAttendanceRecord(rec.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Single Attendance Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                <span>Add Attendance Record</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRecordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Student
                </label>
                <select
                  value={newRecordData.studentId}
                  onChange={(e) => setNewRecordData({ ...newRecordData, studentId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
                  required
                >
                  <option value="">Choose Student...</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.studentId}>
                      {st.name} ({st.studentId} - {st.className})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Class</label>
                  <select
                    value={newRecordData.className}
                    onChange={(e) => setNewRecordData({ ...newRecordData, className: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium"
                  >
                    <option value="B.Tech CSE 3rd Year">B.Tech CSE 3rd Year</option>
                    <option value="B.Tech ECE 2nd Year">B.Tech ECE 2nd Year</option>
                    <option value="M.Tech AI 1st Year">M.Tech AI 1st Year</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
                  <select
                    value={newRecordData.subject}
                    onChange={(e) => setNewRecordData({ ...newRecordData, subject: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium"
                  >
                    <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                    <option value="Database Systems">Database Systems</option>
                    <option value="Digital Signal Processing">Digital Signal Processing</option>
                    <option value="Deep Learning & Neural Nets">Deep Learning</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Date</label>
                  <input
                    type="date"
                    value={newRecordData.date}
                    onChange={(e) => setNewRecordData({ ...newRecordData, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Attendance Status</label>
                  <select
                    value={newRecordData.status}
                    onChange={(e) => setNewRecordData({ ...newRecordData, status: e.target.value as AttendanceStatus })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-indigo-600 dark:text-indigo-400"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Faculty Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Late due to medical reason..."
                  value={newRecordData.notes}
                  onChange={(e) => setNewRecordData({ ...newRecordData, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20 transition-all"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
