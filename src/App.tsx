import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { AttendanceChecker } from './components/AttendanceChecker';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { StudentManager } from './components/StudentManager';
import { SessionManager } from './components/SessionManager';
import { CourseModal } from './components/CourseModal';
import {
  Course,
  Student,
  AttendanceSession,
  AttendanceRecord,
  StudentAnalysis,
  CourseAnalytics,
} from './types';
import {
  getCourses,
  saveCourse,
  getStudents,
  saveStudent,
  saveStudentsBatch,
  deleteStudent,
  getSessions,
  saveSession,
  deleteSession,
  getAttendanceRecords,
  saveAttendanceRecordsBatch,
  getAllCourseRecords,
  computeAnalytics,
  seedSampleCourseData,
} from './services/courseService';
import { Sparkles, Loader2, BookOpen, Plus } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, loading: authLoading, activeUid, activeEmail } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [currentSessionRecords, setCurrentSessionRecords] = useState<AttendanceRecord[]>([]);

  // Map of session records for analytics
  const [recordsBySession, setRecordsBySession] = useState<Map<string, AttendanceRecord[]>>(
    new Map()
  );

  const [activeTab, setActiveTab] = useState<'attendance' | 'dashboard' | 'students' | 'sessions'>(
    'attendance'
  );
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load courses when user is authenticated
  const loadCourses = useCallback(async () => {
    if (!activeUid) return;
    setLoadingData(true);
    try {
      const list = await getCourses(activeUid);
      setCourses(list);
      if (list.length > 0) {
        setSelectedCourseId(list[0].id);
      }
    } catch (e) {
      console.error('Failed to load courses:', e);
    } finally {
      setLoadingData(false);
    }
  }, [activeUid]);

  useEffect(() => {
    if (activeUid) {
      loadCourses();
    }
  }, [activeUid, loadCourses]);

  // Load students & sessions when selected course changes
  const loadCourseData = useCallback(async () => {
    if (!selectedCourseId || !activeUid) {
      setStudents([]);
      setSessions([]);
      setActiveSessionId('');
      setCurrentSessionRecords([]);
      setRecordsBySession(new Map());
      return;
    }

    try {
      const [stdList, sessList] = await Promise.all([
        getStudents(selectedCourseId, activeUid),
        getSessions(selectedCourseId, activeUid),
      ]);

      setStudents(stdList);
      setSessions(sessList);

      // Select active session (prefer the latest or first)
      if (sessList.length > 0) {
        setActiveSessionId(sessList[0].id);
      } else {
        setActiveSessionId('');
      }

      // Load all attendance records for this course to feed analytics
      const allRecs = await getAllCourseRecords(selectedCourseId, sessList, activeUid);
      setRecordsBySession(allRecs);

      // If active session exists, set its records
      if (sessList.length > 0) {
        setCurrentSessionRecords(allRecs.get(sessList[0].id) || []);
      }
    } catch (e) {
      console.error('Failed to load course details:', e);
    }
  }, [selectedCourseId, activeUid]);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseData();
    }
  }, [selectedCourseId, loadCourseData]);

  // When active session changes, load its records
  useEffect(() => {
    if (activeSessionId && recordsBySession.has(activeSessionId)) {
      setCurrentSessionRecords(recordsBySession.get(activeSessionId) || []);
    } else if (activeSessionId && selectedCourseId && activeUid) {
      getAttendanceRecords(selectedCourseId, activeSessionId, activeUid).then((recs) => {
        setCurrentSessionRecords(recs);
        setRecordsBySession((prev) => {
          const next = new Map(prev);
          next.set(activeSessionId, recs);
          return next;
        });
      });
    }
  }, [activeSessionId, selectedCourseId, activeUid, recordsBySession]);

  // Compute analytics & student statistics
  const analytics: CourseAnalytics = useMemo(() => {
    return computeAnalytics(students, sessions, recordsBySession);
  }, [students, sessions, recordsBySession]);

  const studentAnalysesMap = useMemo(() => {
    const map = new Map<string, StudentAnalysis>();
    // Calculate individual student stats
    students.forEach((s) => {
      // Find matching item from analytics consecutive list or compute inline
      const match = analytics.consecutiveAbsentStudents.find((item) => item.student.id === s.id);
      if (match) {
        map.set(s.id, match);
      }
    });
    return map;
  }, [students, analytics]);

  // Create course handler
  const handleCreateCourse = async (data: Omit<Course, 'id' | 'ownerUid'>) => {
    const courseId = `course-${Date.now()}`;
    const newCourse: Course = {
      ...data,
      id: courseId,
      ownerUid: activeUid,
      ownerEmail: activeEmail,
    };
    await saveCourse(newCourse);
    setCourses((prev) => [newCourse, ...prev]);
    setSelectedCourseId(courseId);
  };

  // Seed sample course handler
  const handleSeedSample = async () => {
    if (!activeUid) return;
    setLoadingData(true);
    try {
      const updated = await seedSampleCourseData(activeUid, activeEmail);
      setCourses(updated);
      if (updated.length > 0) {
        setSelectedCourseId(updated[0].id);
      }
    } catch (e) {
      console.error('Failed to seed sample:', e);
    } finally {
      setLoadingData(false);
    }
  };

  // Save attendance records
  const handleSaveRecords = async (
    records: AttendanceRecord[],
    sessionSummary: Partial<AttendanceSession>
  ) => {
    if (!selectedCourseId || !activeSessionId || !activeUid) return;

    await saveAttendanceRecordsBatch(
      selectedCourseId,
      activeSessionId,
      records,
      sessionSummary,
      activeUid
    );

    // Update local state
    setCurrentSessionRecords(records);
    setRecordsBySession((prev) => {
      const next = new Map(prev);
      next.set(activeSessionId, records);
      return next;
    });

    // Update session summary in sessions list
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, ...sessionSummary } : s))
    );
  };

  // Student Manager Handlers
  const handleAddStudent = async (data: Omit<Student, 'id' | 'courseId' | 'ownerUid'>) => {
    if (!selectedCourseId || !activeUid) return;
    const newStd: Student = {
      ...data,
      id: `std-${Date.now()}`,
      courseId: selectedCourseId,
      ownerUid: activeUid,
    };
    await saveStudent(newStd);
    setStudents((prev) => [...prev, newStd].sort((a, b) => a.studentCode.localeCompare(b.studentCode)));
  };

  const handleBulkAddStudents = async (
    list: Omit<Student, 'id' | 'courseId' | 'ownerUid'>[]
  ) => {
    if (!selectedCourseId || !activeUid) return;
    const studentsToSave: Student[] = list.map((item, idx) => ({
      ...item,
      id: `std-${Date.now()}-${idx}`,
      courseId: selectedCourseId,
      ownerUid: activeUid,
    }));
    await saveStudentsBatch(selectedCourseId, studentsToSave, activeUid);
    setStudents((prev) =>
      [...prev, ...studentsToSave].sort((a, b) => a.studentCode.localeCompare(b.studentCode))
    );
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!selectedCourseId || !activeUid) return;
    await deleteStudent(selectedCourseId, studentId, activeUid);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  // Session Manager Handlers
  const handleAddSession = async (
    data: Omit<AttendanceSession, 'id' | 'courseId' | 'ownerUid'>
  ) => {
    if (!selectedCourseId || !activeUid) return;
    const newSess: AttendanceSession = {
      ...data,
      id: `sess-${Date.now()}`,
      courseId: selectedCourseId,
      ownerUid: activeUid,
      totalStudents: students.length,
      presentCount: 0,
      absentCount: 0,
      leaveCount: 0,
      lateCount: 0,
      avgParticipation: 0,
    };
    await saveSession(newSess);
    setSessions((prev) => [...prev, newSess].sort((a, b) => a.weekNumber - b.weekNumber));
    setActiveSessionId(newSess.id);
    setActiveTab('attendance');
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!selectedCourseId || !activeUid) return;
    await deleteSession(selectedCourseId, sessionId, activeUid);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  // If auth is loading, show clean loader
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // If not logged in, enforce login screen
  if (!currentUser && !activeUid) {
    return <LoginScreen />;
  }

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Navbar with responsive tabs */}
      <Navbar
        courses={courses}
        selectedCourseId={selectedCourseId}
        onSelectCourse={setSelectedCourseId}
        onOpenCreateCourse={() => setIsCourseModalOpen(true)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onSeedSample={handleSeedSample}
        studentCount={students.length}
        sessionCount={sessions.length}
        alertCount={analytics.consecutiveAbsentStudents.length}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm">กำลังเชื่อมต่อและโหลดข้อมูลจาก Firebase...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">ยินดีต้อนรับสู่อาจารย์ผู้สอน</h2>
            <p className="text-slate-600 text-sm mb-6">
              ยังไม่มีรายวิชาที่สร้างไว้ ท่านสามารถสร้างวิชาใหม่ หรือโหลดข้อมูลจำลองชั้นเรียนเพื่อทดลองระบบได้ทันที
            </p>
            <div className="space-y-3">
              <button
                onClick={handleSeedSample}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>โหลดวิชาตัวอย่างพร้อมข้อมูล 24 คน</span>
              </button>
              <button
                onClick={() => setIsCourseModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างวิชาใหม่ด้วยตนเอง</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* View 1: Fast Attendance Checker */}
            {activeTab === 'attendance' && (
              <AttendanceChecker
                courseId={selectedCourseId}
                courseName={currentCourse?.name || ''}
                students={students}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={setActiveSessionId}
                onOpenCreateSession={() => setActiveTab('sessions')}
                records={currentSessionRecords}
                onSaveRecords={handleSaveRecords}
                studentAnalyses={studentAnalysesMap}
                ownerUid={activeUid}
              />
            )}

            {/* View 2: Dashboard Analytics */}
            {activeTab === 'dashboard' && (
              <DashboardAnalytics
                analytics={analytics}
                studentAnalyses={analytics.consecutiveAbsentStudents.concat(
                  students
                    .filter(
                      (s) =>
                        !analytics.consecutiveAbsentStudents.some(
                          (item) => item.student.id === s.id
                        )
                    )
                    .map((s) => {
                      // Return base analysis for table
                      const match = computeAnalytics(
                        [s],
                        sessions,
                        recordsBySession
                      );
                      const stdAnalysis =
                        match.consecutiveAbsentStudents[0] ||
                        match.weeklyTrends.length >= 0;
                      // Fallback compute single student analysis
                      let attended = 0;
                      let late = 0;
                      let leave = 0;
                      let absent = 0;
                      let partSum = 0;
                      let total = 0;

                      sessions.forEach((sess) => {
                        const recs = recordsBySession.get(sess.id) || [];
                        const r = recs.find((rec) => rec.studentId === s.id);
                        if (r) {
                          total++;
                          if (r.status === 'present') attended++;
                          else if (r.status === 'late') {
                            attended += 0.8;
                            late++;
                          } else if (r.status === 'leave') leave++;
                          else if (r.status === 'absent') absent++;
                          partSum += r.participationScore || 0;
                        }
                      });

                      const rate = total > 0 ? Math.round((attended / total) * 100) : 100;
                      const risk: 'normal' | 'warning' | 'critical' =
                        rate >= 80 ? 'normal' : rate >= 60 ? 'warning' : 'critical';

                      return {
                        student: s,
                        totalSessions: total,
                        attendedCount: Math.round(attended * 10) / 10,
                        lateCount: late,
                        leaveCount: leave,
                        absentCount: absent,
                        attendanceRate: rate,
                        participationTotal: partSum,
                        participationAverage: total > 0 ? Number((partSum / total).toFixed(1)) : 0,
                        consecutiveAbsences: 0,
                        maxConsecutiveAbsences: 0,
                        isConsecutiveRisk: false,
                        riskGroup: risk,
                        sessionRecords: [],
                      };
                    })
                )}
                courseCode={currentCourse?.code || ''}
                courseName={currentCourse?.name || ''}
              />
            )}

            {/* View 3: Students Management */}
            {activeTab === 'students' && (
              <StudentManager
                courseId={selectedCourseId}
                students={students}
                onAddStudent={handleAddStudent}
                onBulkAddStudents={handleBulkAddStudents}
                onDeleteStudent={handleDeleteStudent}
              />
            )}

            {/* View 4: Sessions Management */}
            {activeTab === 'sessions' && (
              <SessionManager
                courseId={selectedCourseId}
                sessions={sessions}
                onAddSession={handleAddSession}
                onDeleteSession={handleDeleteSession}
                onSelectAndCheck={(sessId) => {
                  setActiveSessionId(sessId);
                  setActiveTab('attendance');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Create Course Modal */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSave={handleCreateCourse}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
