import React, { useState } from 'react';
import { Student } from '../types';
import { Users, Plus, Upload, Trash2, Edit2, Search, Check, AlertCircle } from 'lucide-react';

interface StudentManagerProps {
  courseId: string;
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id' | 'courseId' | 'ownerUid'>) => Promise<void>;
  onBulkAddStudents: (students: Omit<Student, 'id' | 'courseId' | 'ownerUid'>[]) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  courseId,
  students,
  onAddStudent,
  onBulkAddStudents,
  onDeleteStudent,
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Single Add Form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Add Form
  const [bulkText, setBulkText] = useState('');

  const filteredStudents = students.filter(
    (s) =>
      s.studentCode.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.nickname && s.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      alert('กรุณากรอกรหัสนักศึกษาและชื่อ-นามสกุล');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddStudent({
        studentCode: newCode.trim(),
        name: newName.trim(),
        nickname: newNickname.trim(),
        group: newGroup.trim(),
      });
      setNewCode('');
      setNewName('');
      setNewNickname('');
      setNewGroup('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเพิ่มนักศึกษาได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n');
    const parsed: Omit<Student, 'id' | 'courseId' | 'ownerUid'>[] = [];

    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      // Split by tab, comma, or spaces
      // Example line: "660701001 นายสมชาย สบายใจ" or "660701001, สมชาย สบายใจ, กลุ่ม1"
      const parts = cleanLine.split(/[\t,]+/).map((p) => p.trim());
      if (parts.length >= 2) {
        parsed.push({
          studentCode: parts[0],
          name: parts[1],
          group: parts[2] || '',
        });
      } else {
        // Try space-separated: first token is code, remaining is name
        const spaceParts = cleanLine.split(/\s+/);
        if (spaceParts.length >= 2) {
          const code = spaceParts[0];
          const name = spaceParts.slice(1).join(' ');
          parsed.push({
            studentCode: code,
            name,
            group: '',
          });
        }
      }
    });

    if (parsed.length === 0) {
      alert('ไม่สามารถอ่านข้อมูลได้ กรุณาตรวจสอบรูปแบบ เช่น รหัสนักศึกษา ชื่อ-นามสกุล บรรทัดละ 1 คน');
      return;
    }

    setIsSubmitting(true);
    try {
      await onBulkAddStudents(parsed);
      setBulkText('');
      setShowBulkModal(false);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถนำเข้าข้อมูลได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 space-y-4 pb-20">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>จัดการรายชื่อนักศึกษา ({students.length} คน)</span>
          </h2>
          <p className="text-slate-500 text-xs">
            เพิ่ม แก้ไข หรือนำเข้ารายชื่อด้วยรหัสนักศึกษาจากไฟล์ Excel/Sheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>นำเข้าแบบชุด (Bulk)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มนักศึกษา</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="ค้นหาตามรหัสนักศึกษา, ชื่อ, หรือชื่อเล่น..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {students.length === 0 ? 'ยังไม่มีรายชื่อนักศึกษาในวิชานี้' : 'ไม่พบข้อมูลที่ตรงกับการค้นหา'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudents.map((std, idx) => (
              <div
                key={std.id}
                className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {std.studentCode}
                      </span>
                      <span className="font-medium text-slate-800 text-sm">{std.name}</span>
                      {std.nickname && (
                        <span className="text-xs text-slate-400">({std.nickname})</span>
                      )}
                    </div>
                    {std.group && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{std.group}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      if (confirm(`ยืนยันการลบ ${std.studentCode} ${std.name} หรือไม่?`)) {
                        onDeleteStudent(std.id);
                      }
                    }}
                    title="ลบนักศึกษา"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Single Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-900 mb-4">เพิ่มนักศึกษาใหม่</h3>
            <form onSubmit={handleSingleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสนักศึกษา <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น 660701001"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น นายกิตติศักดิ์ พัฒนสุข"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    placeholder="เช่น ก้อง"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">กลุ่ม / ตอน</label>
                  <input
                    type="text"
                    placeholder="เช่น กลุ่ม 1"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-900 mb-2">นำเข้ารายชื่อนักศึกษาเป็นชุด</h3>
            <p className="text-slate-500 text-xs mb-3">
              คัดลอกจาก Google Sheets หรือ Excel แล้ววางลงในช่องนี้ (บรรทัดละ 1 คน รูปแบบ: รหัสนักศึกษา ชื่อ-นามสกุล กลุ่ม)
            </p>

            <textarea
              rows={7}
              placeholder={`660701001 นายกิตติศักดิ์ พัฒนสุข กลุ่ม 1\n660701002 นางสาวจิราภรณ์ วงศ์สว่าง กลุ่ม 1\n660701003 นายชนาธิป ปรีชากุล กลุ่ม 2`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
              >
                นำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
