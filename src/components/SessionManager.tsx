import React, { useState } from 'react';
import { AttendanceSession } from '../types';
import { CalendarDays, Plus, Trash2, CheckCircle2, ChevronRight, Calendar } from 'lucide-react';

interface SessionManagerProps {
  courseId: string;
  sessions: AttendanceSession[];
  onAddSession: (session: Omit<AttendanceSession, 'id' | 'courseId' | 'ownerUid'>) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onSelectAndCheck: (sessionId: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  courseId,
  sessions,
  onAddSession,
  onDeleteSession,
  onSelectAndCheck,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [weekNumber, setWeekNumber] = useState<number>(sessions.length + 1);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      alert('กรุณาระบุวันที่');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddSession({
        weekNumber: Number(weekNumber),
        date,
        topic: topic.trim() || `สัปดาห์ที่ ${weekNumber}`,
      });
      setWeekNumber(sessions.length + 2);
      setTopic('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเพิ่มคาบเรียนได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-4 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <span>สัปดาห์ & คาบเรียน ({sessions.length} คาบ)</span>
          </h2>
          <p className="text-slate-500 text-xs">
            กำหนดวันที่และหัวข้อการสอนแต่ละสัปดาห์ในภาคเรียน
          </p>
        </div>

        <button
          onClick={() => {
            setWeekNumber(sessions.length + 1);
            setShowAddModal(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มสัปดาห์ถัดไป</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="space-y-2.5">
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            ยังไม่มีข้อมูลคาบเรียน คลิก "เพิ่มสัปดาห์ถัดไป" เพื่อเริ่มต้น
          </div>
        ) : (
          sessions.map((sess) => {
            const hasRecorded = (sess.presentCount || 0) + (sess.absentCount || 0) > 0;
            return (
              <div
                key={sess.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold text-sm flex items-center justify-center shrink-0 border border-indigo-100">
                    W{sess.weekNumber}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                      <span>สัปดาห์ที่ {sess.weekNumber}</span>
                      <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {sess.date}
                      </span>
                      {hasRecorded ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>เช็กชื่อแล้ว</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                          ยังไม่เช็กชื่อ
                        </span>
                      )}
                    </div>
                    {sess.topic && (
                      <div className="text-xs text-slate-600 mt-1">{sess.topic}</div>
                    )}
                    {hasRecorded && (
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span className="text-emerald-600 font-semibold">มา {sess.presentCount}</span>
                        <span>สาย {sess.lateCount || 0}</span>
                        <span>ลา {sess.leaveCount || 0}</span>
                        <span className="text-rose-600 font-semibold">ขาด {sess.absentCount}</span>
                        <span>| มีส่วนร่วม {sess.avgParticipation || 0} ดาว</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onSelectAndCheck(sess.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <span>เปิดหน้าเช็กชื่อ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`ยืนยันการลบสัปดาห์ที่ ${sess.weekNumber} (${sess.date}) หรือไม่?`)) {
                        onDeleteSession(sess.id);
                      }
                    }}
                    title="ลบสัปดาห์นี้"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-900 mb-4">เพิ่มสัปดาห์คาบเรียนใหม่</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สัปดาห์ที่ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    required
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันที่ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวข้อการสอน / กิจกรรม (Topic)
                </label>
                <input
                  type="text"
                  placeholder="เช่น แนะนำวิชา และทบทวนพื้นฐาน"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  เพิ่มคาบเรียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
