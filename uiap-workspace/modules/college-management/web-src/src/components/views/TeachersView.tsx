import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  BookOpen,
  Building2,
  Edit2,
  Trash2,
  Award,
  CheckCircle2,
  QrCode,
} from 'lucide-react';
import { Teacher } from '../../types';
import { Modal } from '../common/Modal';

export const TeachersView: React.FC = () => {
  const { teachers, addTeacher, updateTeacher, deleteTeacher, addToast, setActiveTab } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [selectedTeacherForDrawer, setSelectedTeacherForDrawer] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState({
    teacherId: '',
    name: '',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    email: '',
    phone: '',
    department: 'Computer Science',
    qualification: 'Ph.D in Computer Science',
    assignedClasses: ['B.Tech CSE 3rd Year - A'],
    assignedSubjects: ['CS-301 Data Structures'],
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
  });

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'all' || t.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleOpenAdd = () => {
    setFormData({
      teacherId: `EMP-T-${100 + teachers.length + 1}`,
      name: '',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      email: '',
      phone: '',
      department: 'Computer Science',
      qualification: 'Ph.D in Computer Science',
      assignedClasses: ['B.Tech CSE 3rd Year - A'],
      assignedSubjects: ['CS-301 Data Structures'],
      status: 'Active',
    });
    setEditingTeacher(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({ ...t });
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, formData);
    } else {
      addTeacher(formData);
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = () => {
    if (deletingTeacherId) {
      deleteTeacher(deletingTeacherId);
      setDeletingTeacherId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Faculty & Teacher Roster</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage institutional faculty profiles, qualifications, assigned subjects, and teaching schedules
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search faculty by name or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none w-full md:w-auto"
        >
          <option value="all">All Departments</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Electronics & Comm.">Electronics & Comm.</option>
          <option value="Mechanical Eng.">Mechanical Eng.</option>
        </select>
      </div>

      {/* Teacher Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeachers.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/30"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.name}</h3>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      {t.teacherId} • {t.department}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    t.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 text-slate-500">
                  <Award className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{t.qualification}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{t.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{t.phone}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Assigned Subjects
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {t.assignedSubjects.map((sub, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Assigned Classes
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {t.assignedClasses.map((cls, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-semibold"
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => setActiveTab('attendance')}
                className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Attendance</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedTeacherForDrawer(t)}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Schedule
                </button>
                <button
                  onClick={() => handleOpenEdit(t)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingTeacherId(t.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingTeacher ? 'Edit Faculty Record' : 'Add Faculty Member'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Faculty Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dr. Rajesh Swaminathan"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Phone
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            >
              <option value="Computer Science">Computer Science</option>
              <option value="Electronics & Comm.">Electronics & Comm.</option>
              <option value="Mechanical Eng.">Mechanical Eng.</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Qualification
            </label>
            <input
              type="text"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold"
            >
              Save Faculty Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Teacher Profile Schedule Modal */}
      <Modal
        isOpen={!!selectedTeacherForDrawer}
        onClose={() => setSelectedTeacherForDrawer(null)}
        title={selectedTeacherForDrawer?.name || 'Faculty Detail'}
        maxWidth="md"
      >
        {selectedTeacherForDrawer && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <img
                src={selectedTeacherForDrawer.photo}
                alt={selectedTeacherForDrawer.name}
                className="w-14 h-14 rounded-2xl object-cover"
              />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {selectedTeacherForDrawer.name}
                </h3>
                <p className="text-slate-500">{selectedTeacherForDrawer.teacherId}</p>
                <p className="text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                  {selectedTeacherForDrawer.qualification}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Weekly Lecture Teaching Load</h4>
              <div className="space-y-2">
                {selectedTeacherForDrawer.assignedSubjects.map((sub, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{sub}</p>
                      <p className="text-[11px] text-slate-500">Scheduled: Mon, Wed, Fri • 09:00 AM</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deletingTeacherId}
        onClose={() => setDeletingTeacherId(null)}
        title="Confirm Delete"
      >
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
          Are you sure you want to remove this faculty record?
        </p>
        <div className="flex justify-end gap-2 text-xs">
          <button onClick={() => setDeletingTeacherId(null)} className="px-4 py-2">
            Cancel
          </button>
          <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};
