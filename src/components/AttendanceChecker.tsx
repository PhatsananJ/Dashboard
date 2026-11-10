import React, { useState, useEffect, useMemo } from 'react';
import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  AttendanceStatus,
  StudentAnalysis,
} from '../types';
import {
  Check,
  X,
  Clock,
  FileText,
  Star,
  Search,
  Filter,
  AlertTriangle,
  Zap,
  Save,
  Calendar,
  ChevronDown,
  Plus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface AttendanceCheckerProps {
  courseId: string;
  courseName: string;
  students: Student[];
  sessions: AttendanceSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onOpenCreateSession: () => void;
  records: AttendanceRecord[];
  onSaveRecords: (records: AttendanceRecord[], sessionSummary: Partial<AttendanceSession>) => Promise<void>;
  studentAnalyses: Map<string, StudentAnalysis>;
  ownerUid: string;
}

const PARTICIPATION_TAG_OPTIONS = [
  'ตอบคำถาม',
  'ทำกิจกรรมกลุ่ม',
  'ช่วยเพื่อน',
  'นำเสนอหน้าชั้น',
  'ส่งงานตรงเวลา',
];

export const AttendanceChecker: React.FC<AttendanceCheckerProps> = ({
  courseId,
  courseName,
  students,
  sessions,
  activeSessionId,
  onSelectSession,
  onOpenCreateSession,
  records,
  onSaveRecords,
  studentAnalyses,
  ownerUid,
}) => {
  // Local working records map for instant optimistic responsive UI
  const [localRecords, setLocalRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus | 'consecutive_risk'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Initialize or update records when session or external records change
  useEffect(() => {
    const map = new Map<string, AttendanceRecord>();

    // First populate from existing saved records
    records.forEach((rec) => {
      map.set(rec.studentId, rec);
    });

    // For any student who doesn't have a record yet, create a default 'present' or uninitialized record
    students.forEach((student) => {
      if (!map.has(student.id)) {
        map.set(student.id, {
          id: `rec-${activeSessionId}-${student.id}`,
          sessionId: activeSessionId,
          courseId,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.name,
          status: 'present', // Default to present for maximum speed
          participationScore: 1, // Default 1 point for attending
          participationTags: ['มีส่วนร่วม'],
          note: '',
          ownerUid,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    setLocalRecords(map);
  }, [activeSessionId, courseId, students, records, ownerUid]);

  // Handle single student status change
  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setLocalRecords((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId);
      if (current) {
        // If changing to absent or leave, adjust default participation score to 0 if it was positive
        let newPartScore = current.participationScore;
        let newTags = [...current.participationTags];
        if (newStatus === 'absent' || newStatus === 'leave') {
          newPartScore = 0;
          newTags = [];
        } else if (newPartScore === 0) {
          newPartScore = 1;
        }

        next.set(studentId, {
          ...current,
          status: newStatus,
          participationScore: newPartScore,
          participationTags: newTags,
          updatedAt: new Date().toISOString(),
        });
      }
      return next;
    });
  };

  // Handle participation score change (0, 1, 2, 3)
  const handleScoreChange = (studentId: string, score: number) => {
    setLocalRecords((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId);
      if (current) {
        next.set(studentId, {
          ...current,
          participationScore: score,
          // If score is set > 0 but status was absent/leave, suggest changing to present
          status: (current.status === 'absent' || current.status === 'leave') && score > 0 ? 'present' : current.status,
          updatedAt: new Date().toISOString(),
        });
      }
      return next;
    });
  };

  // Toggle quick participation tag
  const handleToggleTag = (studentId: string, tag: string) => {
    setLocalRecords((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId);
      if (current) {
        const exists = current.participationTags.includes(tag);
        const updatedTags = exists
          ? current.participationTags.filter((t) => t !== tag)
          : [...current.participationTags, tag];

        // Auto boost participation score if adding active tag
        let score = current.participationScore;
        if (!exists && score < 2) {
          score = 2;
        }

        next.set(studentId, {
          ...current,
          participationTags: updatedTags,
          participationScore: score,
          updatedAt: new Date().toISOString(),
        });
      }
      return next;
    });
  };

  // Handle note change
  const handleNoteChange = (studentId: string, noteText: string) => {
    setLocalRecords((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId);
      if (current) {
        next.set(studentId, {
          ...current,
          note: noteText,
          updatedAt: new Date().toISOString(),
        });
      }
      return next;
    });
  };

  // Fast Mass Action: Mark ALL present with 1 point!
  const handleMarkAllPresent = () => {
    setLocalRecords((prev) => {
      const next = new Map(prev);
      students.forEach((std) => {
        const current = next.get(std.id);
        next.set(std.id, {
          id: current?.id || `rec-${activeSessionId}-${std.id}`,
          sessionId: activeSessionId,
          courseId,
          studentId: std.id,
          studentCode: std.studentCode,
          studentName: std.name,
          status: 'present',
          participationScore: current?.participationScore && current.participationScore > 0 ? current.participationScore : 1,
          participationTags: current?.participationTags && current.participationTags.length > 0 ? current.participationTags : ['มีส่วนร่วม'],
          note: current?.note || '',
          ownerUid,
          updatedAt: new Date().toISOString(),
        });
      });
      return next;
    });
  };

  // Compute live counts
  const liveStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let late = 0;
    let partSum = 0;

    localRecords.forEach((r) => {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'late') late++;
      partSum += r.participationScore || 0;
    });

    const total = students.length;
    const avgPart = total > 0 ? Number((partSum / total).toFixed(1)) : 0;
    const attendancePercentage = total > 0 ? Math.round(((present + late * 0.8) / total) * 100) : 0;

    return {
      present,
      absent,
      leave,
      late,
      total,
      avgPart,
      attendancePercentage,
    };
  }, [localRecords, students]);

  // Save changes to database
  const handleSave = async () => {
    if (!activeSessionId) return;
    setIsSaving(true);
    try {
      const recordsArray = Array.from(localRecords.values());
      const sessionSummary: Partial<AttendanceSession> = {
        totalStudents: liveStats.total,
        presentCount: liveStats.present,
        absentCount: liveStats.absent,
        leaveCount: liveStats.leave,
        lateCount: liveStats.late,
        avgParticipation: liveStats.avgPart,
      };

      await onSaveRecords(recordsArray, sessionSummary);
      setSaveSuccessMessage(true);
      setTimeout(() => setSaveSuccessMessage(false), 3000);
    } catch (e) {
      console.error('Failed to save records:', e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search query
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        student.studentCode.toLowerCase().includes(q) ||
        student.name.toLowerCase().includes(q) ||
        (student.nickname && student.nickname.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Status filter
      const record = localRecords.get(student.id);
      const studentAnalysis = studentAnalyses.get(student.id);

      if (statusFilter === 'all') return true;
      if (statusFilter === 'consecutive_risk') {
        return studentAnalysis?.isConsecutiveRisk || false;
      }
      return record?.status === statusFilter;
    });
  }, [students, searchQuery, statusFilter, localRecords, studentAnalyses]);

  if (sessions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-sm">
        <Calendar className="w-16 h-16 text-indigo-500 mx-auto mb-4 opacity-80" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">ยังไม่มีคาบเรียนในวิชานี้</h2>
        <p className="text-slate-600 text-sm mb-6">
          กรุณาสร้างสัปดาห์หรือคาบเรียนแรกเพื่อเริ่มเช็กชื่อและบันทึกการมีส่วนร่วม
        </p>
        <button
          onClick={onOpenCreateSession}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium inline-flex items-center gap-2 cursor-pointer transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มสัปดาห์ที่ 1 ทันที</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 pb-28">
      {/* Top Header Card: Session Selection & Fast Action */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
          {/* Week Selector */}
          <div className="flex items-center gap-2 flex-1">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                สัปดาห์ที่เลือกเช็กชื่อ
              </div>
              <div className="relative">
                <select
                  value={activeSessionId}
                  onChange={(e) => onSelectSession(e.target.value)}
                  className="w-full text-sm sm:text-base font-bold text-slate-800 bg-transparent pr-7 py-0.5 focus:outline-none cursor-pointer truncate"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      สัปดาห์ที่ {s.weekNumber} : {s.date} {s.topic ? `- ${s.topic}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleMarkAllPresent}
              title="ตั้งค่าทุกคนเป็น 'มา' ทันทีในคลิกเดียว"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>มาทุกคน (Check All)</span>
            </button>

            <button
              onClick={onOpenCreateSession}
              title="เพิ่มสัปดาห์ถัดไป"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-center">
          <div
            onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              statusFilter === 'present' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="text-[10px] font-medium opacity-80">มา</div>
            <div className="text-base sm:text-lg font-bold">{liveStats.present}</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              statusFilter === 'late' ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="text-[10px] font-medium opacity-80">สาย</div>
            <div className="text-base sm:text-lg font-bold">{liveStats.late}</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'leave' ? 'all' : 'leave')}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              statusFilter === 'leave' ? 'bg-sky-500 text-white border-sky-600' : 'bg-sky-50 border-sky-200 text-sky-800'
            }`}
          >
            <div className="text-[10px] font-medium opacity-80">ลา</div>
            <div className="text-base sm:text-lg font-bold">{liveStats.leave}</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              statusFilter === 'absent' ? 'bg-rose-500 text-white border-rose-600' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="text-[10px] font-medium opacity-80">ขาด</div>
            <div className="text-base sm:text-lg font-bold">{liveStats.absent}</div>
          </div>

          <div className="hidden sm:block p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <div className="text-[10px] font-medium text-slate-500">มีส่วนร่วมเฉลี่ย</div>
            <div className="text-base sm:text-lg font-bold flex items-center justify-center gap-0.5 text-amber-600">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{liveStats.avgPart}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ค้นหารหัสนักศึกษา หรือชื่อ-สกุล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Quick Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด ({students.length})
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'consecutive_risk' ? 'all' : 'consecutive_risk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer flex items-center gap-1 ${
              statusFilter === 'consecutive_risk'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ขาดติดกัน 2+ ครั้ง</span>
          </button>
        </div>
      </div>

      {/* Notice if filtered by risk */}
      {statusFilter === 'consecutive_risk' && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>
            แสดงเฉพาะนักศึกษาที่<strong>ขาดเรียนติดต่อกันตั้งแต่ 2 ครั้งขึ้นไป</strong> เพื่อให้อาจารย์ติดตามช่วยเหลือหรือตักเตือนก่อนหมดสิทธิ์สอบ
          </span>
        </div>
      )}

      {/* Student List - Mobile First Touch Cards */}
      <div className="space-y-2.5">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            ไม่พบรายชื่อนักศึกษาที่ตรงกับเงื่อนไข
          </div>
        ) : (
          filteredStudents.map((student, index) => {
            const record = localRecords.get(student.id) || {
              id: `rec-${activeSessionId}-${student.id}`,
              sessionId: activeSessionId,
              courseId,
              studentId: student.id,
              studentCode: student.studentCode,
              studentName: student.name,
              status: 'present' as AttendanceStatus,
              participationScore: 1,
              participationTags: [],
              note: '',
              ownerUid,
            };

            const analysis = studentAnalyses.get(student.id);
            const isConsecutiveAlert = analysis?.isConsecutiveRisk;
            const isExpanded = expandedStudentId === student.id;

            return (
              <div
                key={student.id}
                className={`bg-white rounded-2xl border transition-all duration-150 overflow-hidden shadow-sm ${
                  isConsecutiveAlert
                    ? 'border-rose-300 ring-1 ring-rose-300'
                    : record.status === 'present'
                    ? 'border-emerald-200/90'
                    : record.status === 'absent'
                    ? 'border-rose-200/90'
                    : 'border-slate-200'
                }`}
              >
                {/* Consecutive Absence Alert Banner inside student card */}
                {isConsecutiveAlert && (
                  <div className="bg-rose-500 text-white px-3 py-1 text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      ขาดเกิน 2 ครั้งติดกัน (ขาดแล้ว {analysis?.consecutiveAbsences || analysis?.maxConsecutiveAbsences} ครั้ง)
                    </span>
                    <span className="text-[10px] bg-rose-700/60 px-1.5 py-0.5 rounded">
                      เข้าเรียนสะสม {analysis?.attendanceRate}%
                    </span>
                  </div>
                )}

                <div className="p-3 sm:p-4">
                  {/* Student Code & Name Header */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm sm:text-base text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {student.studentCode}
                        </span>
                        <span className="font-semibold text-slate-800 text-sm sm:text-base truncate">
                          {student.name}
                        </span>
                        {student.nickname && (
                          <span className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                            ({student.nickname})
                          </span>
                        )}
                        {student.group && (
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {student.group}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand/Note toggle button */}
                    <button
                      onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                      className={`p-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        record.note || record.participationTags.length > 0
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="เพิ่มคะแนนการมีส่วนร่วม / บันทึกเพิ่มเติม"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>

                  {/* FAST-TAP STATUS BUTTONS (Large Mobile Friendly Buttons) */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3">
                    {/* มา (Present) */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'present')}
                      className={`py-3 px-2 rounded-xl font-bold text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer select-none ${
                        record.status === 'present'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500 ring-offset-1'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>มา</span>
                    </button>

                    {/* สาย (Late) */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'late')}
                      className={`py-3 px-2 rounded-xl font-bold text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer select-none ${
                        record.status === 'late'
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400 ring-offset-1'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>สาย</span>
                    </button>

                    {/* ลา (Leave) */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'leave')}
                      className={`py-3 px-2 rounded-xl font-bold text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer select-none ${
                        record.status === 'leave'
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-400 ring-offset-1'
                          : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>ลา</span>
                    </button>

                    {/* ขาด (Absent) */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'absent')}
                      className={`py-3 px-2 rounded-xl font-bold text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer select-none ${
                        record.status === 'absent'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500 ring-offset-1'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span>ขาด</span>
                    </button>
                  </div>

                  {/* FAST PARTICIPATION SCORE (0 - 3 points) */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2 border border-slate-100">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>มีส่วนร่วม:</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((score) => {
                        const isSelected = record.participationScore === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleScoreChange(student.id, score)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? score === 3
                                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                                  : score === 2
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : score === 1
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-700 text-white'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {score === 0 ? '0' : `+${score}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* EXPANDABLE SECTION: Quick Activities Tags & Notes */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 animate-fadeIn">
                      {/* Quick Tags */}
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                          แท็กกิจกรรมการมีส่วนร่วม:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {PARTICIPATION_TAG_OPTIONS.map((tag) => {
                            const isSelected = record.participationTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleToggleTag(student.id, tag)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Note */}
                      <div>
                        <input
                          type="text"
                          placeholder="หมายเหตุ เช่น ลากิจ, เข้าสาย 15 นาที, นำเสนองานดีมาก..."
                          value={record.note || ''}
                          onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Action Bar for Mobile & Desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">
              สัปดาห์ที่ {activeSession?.weekNumber} :
            </span>
            <span className="font-semibold text-white">
              มา {liveStats.present} | สาย {liveStats.late} | ลา {liveStats.leave} | ขาด {liveStats.absent}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccessMessage && (
              <span className="text-emerald-400 text-xs font-medium flex items-center gap-1 animate-fadeIn">
                <Check className="w-4 h-4" />
                <span>บันทึกสำเร็จแล้ว</span>
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/40 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเช็กชื่อ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
