import React, { useState } from 'react';
import { Course } from '../types';
import { BookOpen, X } from 'lucide-react';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: Omit<Course, 'id' | 'ownerUid'>) => Promise<void>;
}

export const CourseModal: React.FC<CourseModalProps> = ({ isOpen, onClose, onSave }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [term, setTerm] = useState('ภาคเรียนที่ 2');
  const [academicYear, setAcademicYear] = useState('2567');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert('กรุณากรอกรหัสวิชาและชื่อวิชา');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        code: code.trim(),
        name: name.trim(),
        term,
        academicYear,
      });
      setCode('');
      setName('');
      onClose();
    } catch (e) {
      console.error(e);
      alert('ไม่สามารถสร้างวิชาใหม่ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 text-indigo-600">
          <div className="p-2 rounded-xl bg-indigo-50">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">สร้างรายวิชาใหม่</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสวิชา <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น CS204 หรือ BUS101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อวิชา <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น การเขียนโปรแกรมเว็บและโมบายแอปพลิเคชัน"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ภาคเรียน</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ภาคเรียนที่ 1">ภาคเรียนที่ 1</option>
                <option value="ภาคเรียนที่ 2">ภาคเรียนที่ 2</option>
                <option value="ภาคฤดูร้อน">ภาคฤดูร้อน</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ปีการศึกษา</label>
              <input
                type="text"
                placeholder="2567"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'สร้างรายวิชา'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
