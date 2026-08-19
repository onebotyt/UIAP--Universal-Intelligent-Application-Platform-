import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Users,
  BookOpen,
  Plus,
  CheckSquare,
  Edit2,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { ClassItem } from '../../types';
import { Modal } from '../common/Modal';

export const ClassesView: React.FC = () => {
  const { classes, addClass, updateClass, deleteClass, setActiveTab } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    section: 'Section A',
    academicYear: '2025-2026',
    totalStudents: 60,
    classTeacher: 'Dr. Rajesh Swaminathan',
    subjects: ['Data Structures & Algo', 'Database Systems'],
    roomNumber: 'LH-301',
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      section: 'Section A',
      academicYear: '2025-2026',
      totalStudents: 60,
      classTeacher: 'Dr. Rajesh Swaminathan',
      subjects: ['Data Structures & Algo', 'Database Systems'],
      roomNumber: 'LH-301',
    });
    setEditingClass(null);
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClass) {
      updateClass(editingClass.id, formData);
    } else {
      addClass(formData);
    }
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Class Sections & Academic Batches</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of registered classes, class teacher assignments, total strength, and room allocations
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Class Section</span>
        </button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                    {cls.roomNumber}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {cls.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">{cls.section}</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{cls.academicYear}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 my-4 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Total Strength</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    {cls.totalStudents} Students
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Class Educator</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {cls.classTeacher}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                  Curriculum Subjects
                </span>
                <div className="flex flex-wrap gap-1">
                  {cls.subjects.map((sub, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => setActiveTab('attendance')}
                className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Mark Attendance</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <span>View Roster</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Class Section"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Class Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. B.Tech IT 3rd Year"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Section
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Lecture Hall / Room
              </label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold"
            >
              Save Class
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
