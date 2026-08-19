import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import {
  QrCode,
  Scan,
  Camera,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  Users,
  BookOpen,
  Building2,
  Play,
  Pause,
  Award,
  Zap,
  Check,
  UserCheck,
  Download,
} from 'lucide-react';
import { AttendanceStatus } from '../../types';

export const QrScannerSection: React.FC = () => {
  const { students, classes, subjects, addSingleAttendanceRecord, addToast, userRole, currentUser } = useApp();

  // Mode: 'faculty_scanner' | 'session_generator' | 'student_passes'
  const [activeSubMode, setActiveSubMode] = useState<'faculty_scanner' | 'session_generator' | 'student_passes'>('faculty_scanner');

  // Scanner State
  const [selectedClass, setSelectedClass] = useState('B.Tech CSE 3rd Year');
  const [selectedSection, setSelectedSection] = useState('Section A');
  const [selectedSubject, setSelectedSubject] = useState('Data Structures & Algorithms');
  const [scanStatus, setScanStatus] = useState<AttendanceStatus>('present');
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [lastScannedStudent, setLastScannedStudent] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<
    { id: string; name: string; studentId: string; time: string; status: AttendanceStatus }[]
  >([]);

  // Session Generator State
  const [sessionDuration, setSessionDuration] = useState(15); // mins
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [sessionAttendedCount, setSessionAttendedCount] = useState(0);

  // Filter students by selected class & section
  const roster = students.filter((s) => s.className === selectedClass && s.section === selectedSection);

  // Timer effect for session generator
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSessionActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isSessionActive) {
      setIsSessionActive(false);
      addToast('QR Class Session expired. Generate a new session to continue.', 'warning');
    }
    return () => clearInterval(timer);
  }, [isSessionActive, timeLeft, addToast]);

  // Generate dynamic QR Session
  const handleStartSession = () => {
    const token = `UIAP-SESSION-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setSessionToken(token);
    setTimeLeft(sessionDuration * 60);
    setIsSessionActive(true);
    setSessionAttendedCount(0);
    addToast(`QR Session generated for ${selectedSubject}. Students can scan now!`, 'success');
  };

  // Process a student QR scan
  const handleScanStudent = (studentId: string) => {
    const student = students.find((s) => s.studentId === studentId || s.id === studentId);
    if (!student) {
      addToast('Invalid QR Code. Student not found in system.', 'error');
      return;
    }

    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Mark in central app context
    addSingleAttendanceRecord({
      studentId: student.studentId,
      studentName: student.name,
      className: student.className,
      section: student.section,
      subject: selectedSubject,
      date: new Date().toISOString().split('T')[0],
      checkInTime,
      status: scanStatus,
      method: 'qr_scan',
      markedBy: currentUser.name,
    });

    setLastScannedStudent(student.name);

    // Add to local recent scans feed
    setRecentScans((prev) => [
      {
        id: Math.random().toString(),
        name: student.name,
        studentId: student.studentId,
        time: checkInTime,
        status: scanStatus,
      },
      ...prev.slice(0, 7),
    ]);

    setSessionAttendedCount((prev) => prev + 1);
    addToast(`[QR VERIFIED] ${student.name} marked as ${scanStatus.toUpperCase()}!`, 'success');
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubMode('faculty_scanner')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeSubMode === 'faculty_scanner'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Faculty QR Badge Scanner</span>
          </button>

          <button
            onClick={() => setActiveSubMode('session_generator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeSubMode === 'session_generator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Class Lecture Session QR</span>
          </button>

          <button
            onClick={() => setActiveSubMode('student_passes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeSubMode === 'student_passes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Student QR Passes</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Faculty & Subject Teacher Portal</span>
        </div>
      </div>

      {/* MODE 1: Faculty Camera & Tap QR Scanner */}
      {activeSubMode === 'faculty_scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Camera Viewport + Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Scan className="w-5 h-5 text-indigo-500" />
                    <span>Real-Time Faculty QR Check-In Scanner</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scan student ID cards or tap badges below to instantly register attendance
                  </p>
                </div>

                <button
                  onClick={() => setIsScanningActive(!isScanningActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isScanningActive
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                  }`}
                >
                  {isScanningActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isScanningActive ? 'Pause Camera' : 'Resume Camera'}</span>
                </button>
              </div>

              {/* Class & Subject Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Class Batch</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                  >
                    <option value="B.Tech CSE 3rd Year">B.Tech CSE 3rd Year</option>
                    <option value="B.Tech ECE 2nd Year">B.Tech ECE 2nd Year</option>
                    <option value="M.Tech AI 1st Year">M.Tech AI 1st Year</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                  >
                    <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                    <option value="Database Systems">Database Systems</option>
                    <option value="Digital Signal Processing">Digital Signal Processing</option>
                    <option value="Deep Learning & Neural Nets">Deep Learning</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Apply Status on Scan</label>
                  <select
                    value={scanStatus}
                    onChange={(e) => setScanStatus(e.target.value as AttendanceStatus)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-indigo-600 dark:text-indigo-400"
                  >
                    <option value="present">Mark Present</option>
                    <option value="late">Mark Late</option>
                  </select>
                </div>
              </div>

              {/* Simulated Camera Viewfinder */}
              <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500/30 flex flex-col items-center justify-center p-6 shadow-2xl">
                {isScanningActive ? (
                  <>
                    {/* Corner Reticles */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />

                    {/* Animated Laser Scanning Beam */}
                    <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse" />

                    {/* Target Box */}
                    <div className="w-48 h-48 border-2 border-dashed border-indigo-400/60 rounded-2xl flex flex-col items-center justify-center bg-indigo-950/20 backdrop-blur-xs relative group">
                      <QrCode className="w-16 h-16 text-indigo-400/80 animate-bounce" />
                      <span className="text-[11px] font-mono font-semibold text-indigo-300 mt-2">
                        Align Student QR Code
                      </span>
                    </div>

                    {lastScannedStudent && (
                      <div className="absolute bottom-4 bg-emerald-600/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur flex items-center gap-2 animate-bounce">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Scanned: {lastScannedStudent}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-400 space-y-2">
                    <Camera className="w-12 h-12 mx-auto text-slate-600" />
                    <p className="text-xs font-semibold">Camera scanner paused</p>
                  </div>
                )}
              </div>

              {/* Instant Tap Badge Cards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Quick-Tap Student QR Badges ({roster.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">Click any student card to simulate QR scan</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {roster.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => handleScanStudent(st.studentId)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all text-left flex items-center gap-2.5 group"
                    >
                      <img
                        src={st.photo}
                        alt={st.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                      />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {st.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{st.studentId}</p>
                      </div>
                      <QrCode className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Recent Scans Log */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>Recent Scan Feed</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  {recentScans.length} Scanned
                </span>
              </div>

              {recentScans.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <QrCode className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="text-xs font-medium">No QR scans in current terminal session.</p>
                  <p className="text-[10px] text-slate-400">Tap a student badge above to test check-in.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {recentScans.map((sc) => (
                    <div key={sc.id} className="pt-2.5 flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{sc.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono">{sc.studentId}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {sc.time}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sc.status === 'present'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {sc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: Dynamic Class & Subject Session QR Code Generator */}
      {activeSubMode === 'session_generator' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Class Lecture QR Code Generator</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate a dynamic QR session code for students to scan during lecture hall check-in
              </p>
            </div>

            <button
              onClick={handleStartSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Generate New Dynamic QR</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Session Parameters */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Lecture Parameters
              </h4>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Class & Section</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                >
                  <option value="B.Tech CSE 3rd Year">B.Tech CSE 3rd Year (Sec A)</option>
                  <option value="B.Tech ECE 2nd Year">B.Tech ECE 2nd Year (Sec B)</option>
                  <option value="M.Tech AI 1st Year">M.Tech AI 1st Year (Sec A)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Subject Course</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                >
                  <option value="Data Structures & Algorithms">CS-301 Data Structures & Algorithms</option>
                  <option value="Database Systems">CS-302 Database Systems</option>
                  <option value="Digital Signal Processing">EC-201 Digital Signal Processing</option>
                  <option value="Deep Learning & Neural Nets">AI-502 Deep Learning</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Valid QR Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSessionDuration(mins)}
                      className={`p-2 rounded-lg font-bold text-center border transition-all ${
                        sessionDuration === mins
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Faculty Host:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Students Checked In:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{sessionAttendedCount}</span>
                </div>
              </div>
            </div>

            {/* Main QR Display */}
            <div className="md:col-span-2 flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-4">
              {isSessionActive && sessionToken ? (
                <>
                  <div className="bg-white p-4 rounded-2xl shadow-2xl ring-4 ring-indigo-500/40">
                    <QRCodeSVG
                      value={JSON.stringify({
                        token: sessionToken,
                        className: selectedClass,
                        subject: selectedSubject,
                        host: currentUser.name,
                        validUntil: new Date(Date.now() + timeLeft * 1000).toISOString(),
                      })}
                      size={220}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-lg justify-center">
                      <Clock className="w-5 h-5 animate-spin" />
                      <span>Expires in: {formatTime(timeLeft)}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">Token: {sessionToken}</p>
                    <p className="text-[11px] text-slate-500">Project or display this QR code on the classroom screen</p>
                  </div>

                  {/* Simulator for testing student checkin */}
                  <div className="pt-4 border-t border-slate-800 w-full max-w-md text-center space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Student QR Scan Test Simulator
                    </span>
                    <div className="flex items-center gap-2 justify-center">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleScanStudent(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5"
                      >
                        <option value="">Select Student to Scan QR Code...</option>
                        {roster.map((st) => (
                          <option key={st.id} value={st.studentId}>
                            {st.name} ({st.studentId})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600 border border-slate-700">
                    <QrCode className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-200">No Active Lecture Session QR</h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Click "Generate New Dynamic QR" above to display a live QR code for student check-ins.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: Student Digital QR Passes */}
      {activeSubMode === 'student_passes' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <span>Student Digital Attendance Badges</span>
              </h3>
              <p className="text-xs text-slate-500">
                Official digital QR passes assigned to each student for door scanners and roll call terminals
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium"
              >
                <option value="B.Tech CSE 3rd Year">B.Tech CSE 3rd Year</option>
                <option value="B.Tech ECE 2nd Year">B.Tech ECE 2nd Year</option>
                <option value="M.Tech AI 1st Year">M.Tech AI 1st Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roster.map((st) => (
              <div
                key={st.id}
                className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col items-center text-center space-y-3 relative group"
              >
                <div className="flex items-center gap-3 w-full border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                  <img
                    src={st.photo}
                    alt={st.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                  <div className="text-left min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{st.name}</h4>
                    <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                      {st.studentId}
                    </p>
                    <p className="text-[10px] text-slate-400">{st.className} • {st.section}</p>
                  </div>
                </div>

                {/* QR Code Graphic */}
                <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200">
                  <QRCodeSVG
                    value={JSON.stringify({
                      studentId: st.studentId,
                      name: st.name,
                      className: st.className,
                      section: st.section,
                    })}
                    size={110}
                    level="M"
                  />
                </div>

                <div className="flex items-center justify-between w-full pt-1 text-[10px] text-slate-400 font-medium">
                  <span>UIAP Digital Badge</span>
                  <button
                    onClick={() => handleScanStudent(st.studentId)}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Simulate Faculty Scan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
