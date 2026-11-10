import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Course,
  Student,
  AttendanceSession,
  AttendanceRecord,
  StudentAnalysis,
  CourseAnalytics,
  WeeklyTrend,
  AttendanceStatus,
} from '../types';

const LOCAL_STORAGE_PREFIX = 'classcheck_local_';

function isDemo(ownerUid: string): boolean {
  return ownerUid.startsWith('teacher-demo');
}

// ----------------- LOCAL STORAGE FALLBACK HELPERS -----------------
function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Local storage save error', e);
  }
}

// ----------------- COURSES -----------------
export async function getCourses(ownerUid: string): Promise<Course[]> {
  if (!ownerUid) return [];

  if (isDemo(ownerUid)) {
    const local = getLocal<Course[]>(`courses_${ownerUid}`, []);
    if (local.length === 0) {
      return await seedSampleCourseData(ownerUid, 'instructor@university.ac.th');
    }
    return local;
  }

  const path = 'courses';
  try {
    const q = query(collection(db, path), where('ownerUid', '==', ownerUid));
    const snapshot = await getDocs(q);
    const list: Course[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Course);
    });
    // sort locally by updatedAt or name
    return list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCourse(course: Course): Promise<void> {
  if (isDemo(course.ownerUid)) {
    const courses = getLocal<Course[]>(`courses_${course.ownerUid}`, []);
    const idx = courses.findIndex((c) => c.id === course.id);
    if (idx >= 0) {
      courses[idx] = { ...course, updatedAt: new Date().toISOString() };
    } else {
      courses.unshift({ ...course, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setLocal(`courses_${course.ownerUid}`, courses);
    return;
  }

  const path = `courses/${course.id}`;
  try {
    const courseData = {
      ...course,
      updatedAt: new Date().toISOString(),
      createdAt: course.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'courses', course.id), courseData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCourse(courseId: string, ownerUid: string): Promise<void> {
  if (isDemo(ownerUid)) {
    let courses = getLocal<Course[]>(`courses_${ownerUid}`, []);
    courses = courses.filter((c) => c.id !== courseId);
    setLocal(`courses_${ownerUid}`, courses);
    return;
  }

  const path = `courses/${courseId}`;
  try {
    await deleteDoc(doc(db, 'courses', courseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- STUDENTS -----------------
export async function getStudents(courseId: string, ownerUid: string): Promise<Student[]> {
  if (isDemo(ownerUid)) {
    const students = getLocal<Student[]>(`students_${courseId}`, []);
    return students.sort((a, b) => a.studentCode.localeCompare(b.studentCode));
  }

  const path = `courses/${courseId}/students`;
  try {
    const q = query(collection(db, path), where('ownerUid', '==', ownerUid));
    const snapshot = await getDocs(q);
    const list: Student[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Student);
    });
    return list.sort((a, b) => a.studentCode.localeCompare(b.studentCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveStudent(student: Student): Promise<void> {
  if (isDemo(student.ownerUid)) {
    const list = getLocal<Student[]>(`students_${student.courseId}`, []);
    const idx = list.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      list[idx] = { ...student, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...student, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setLocal(`students_${student.courseId}`, list);
    return;
  }

  const path = `courses/${student.courseId}/students/${student.id}`;
  try {
    const data = {
      ...student,
      updatedAt: new Date().toISOString(),
      createdAt: student.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'courses', student.courseId, 'students', student.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveStudentsBatch(courseId: string, students: Student[], ownerUid: string): Promise<void> {
  if (isDemo(ownerUid)) {
    const existing = getLocal<Student[]>(`students_${courseId}`, []);
    const map = new Map<string, Student>();
    existing.forEach((s) => map.set(s.studentCode, s));
    students.forEach((s) => map.set(s.studentCode, s));
    setLocal(`students_${courseId}`, Array.from(map.values()));
    return;
  }

  const path = `courses/${courseId}/students`;
  try {
    const batch = writeBatch(db);
    students.forEach((st) => {
      const ref = doc(db, 'courses', courseId, 'students', st.id);
      batch.set(ref, {
        ...st,
        updatedAt: new Date().toISOString(),
        createdAt: st.createdAt || new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudent(courseId: string, studentId: string, ownerUid: string): Promise<void> {
  if (isDemo(ownerUid)) {
    let list = getLocal<Student[]>(`students_${courseId}`, []);
    list = list.filter((s) => s.id !== studentId);
    setLocal(`students_${courseId}`, list);
    return;
  }

  const path = `courses/${courseId}/students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'courses', courseId, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- SESSIONS -----------------
export async function getSessions(courseId: string, ownerUid: string): Promise<AttendanceSession[]> {
  if (isDemo(ownerUid)) {
    const list = getLocal<AttendanceSession[]>(`sessions_${courseId}`, []);
    return list.sort((a, b) => a.weekNumber - b.weekNumber);
  }

  const path = `courses/${courseId}/sessions`;
  try {
    const q = query(collection(db, path), where('ownerUid', '==', ownerUid));
    const snapshot = await getDocs(q);
    const list: AttendanceSession[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AttendanceSession);
    });
    return list.sort((a, b) => a.weekNumber - b.weekNumber);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveSession(session: AttendanceSession): Promise<void> {
  if (isDemo(session.ownerUid)) {
    const list = getLocal<AttendanceSession[]>(`sessions_${session.courseId}`, []);
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = { ...session, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...session, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setLocal(`sessions_${session.courseId}`, list);
    return;
  }

  const path = `courses/${session.courseId}/sessions/${session.id}`;
  try {
    const data = {
      ...session,
      updatedAt: new Date().toISOString(),
      createdAt: session.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'courses', session.courseId, 'sessions', session.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSession(courseId: string, sessionId: string, ownerUid: string): Promise<void> {
  if (isDemo(ownerUid)) {
    let list = getLocal<AttendanceSession[]>(`sessions_${courseId}`, []);
    list = list.filter((s) => s.id !== sessionId);
    setLocal(`sessions_${courseId}`, list);
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + `records_${courseId}_${sessionId}`);
    return;
  }

  const path = `courses/${courseId}/sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'courses', courseId, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- ATTENDANCE RECORDS -----------------
export async function getAttendanceRecords(
  courseId: string,
  sessionId: string,
  ownerUid: string
): Promise<AttendanceRecord[]> {
  if (isDemo(ownerUid)) {
    return getLocal<AttendanceRecord[]>(`records_${courseId}_${sessionId}`, []);
  }

  const path = `courses/${courseId}/sessions/${sessionId}/records`;
  try {
    const q = query(collection(db, path), where('ownerUid', '==', ownerUid));
    const snapshot = await getDocs(q);
    const list: AttendanceRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AttendanceRecord);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveAttendanceRecordsBatch(
  courseId: string,
  sessionId: string,
  records: AttendanceRecord[],
  sessionSummary: Partial<AttendanceSession>,
  ownerUid: string
): Promise<void> {
  if (isDemo(ownerUid)) {
    setLocal(`records_${courseId}_${sessionId}`, records);
    // Update session stats
    const sessions = getLocal<AttendanceSession[]>(`sessions_${courseId}`, []);
    const sIdx = sessions.findIndex((s) => s.id === sessionId);
    if (sIdx >= 0) {
      sessions[sIdx] = {
        ...sessions[sIdx],
        ...sessionSummary,
        updatedAt: new Date().toISOString(),
      };
      setLocal(`sessions_${courseId}`, sessions);
    }
    return;
  }

  const recordsPath = `courses/${courseId}/sessions/${sessionId}/records`;
  const sessionPath = `courses/${courseId}/sessions/${sessionId}`;
  try {
    const batch = writeBatch(db);

    // Save records
    records.forEach((rec) => {
      const ref = doc(db, 'courses', courseId, 'sessions', sessionId, 'records', rec.id);
      batch.set(ref, {
        ...rec,
        updatedAt: new Date().toISOString(),
      });
    });

    // Update parent session summary
    const sessionRef = doc(db, 'courses', courseId, 'sessions', sessionId);
    batch.set(
      sessionRef,
      {
        ...sessionSummary,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, recordsPath);
  }
}

// ----------------- ALL COURSE RECORDS FOR ANALYTICS -----------------
export async function getAllCourseRecords(
  courseId: string,
  sessions: AttendanceSession[],
  ownerUid: string
): Promise<Map<string, AttendanceRecord[]>> {
  const map = new Map<string, AttendanceRecord[]>();

  for (const sess of sessions) {
    const recs = await getAttendanceRecords(courseId, sess.id, ownerUid);
    map.set(sess.id, recs);
  }

  return map;
}

// ----------------- ANALYTICS ENGINE -----------------
export function computeAnalytics(
  students: Student[],
  sessions: AttendanceSession[],
  recordsBySession: Map<string, AttendanceRecord[]>
): CourseAnalytics {
  const sortedSessions = [...sessions].sort((a, b) => a.weekNumber - b.weekNumber);

  const studentAnalysisList: StudentAnalysis[] = students.map((student) => {
    let attendedCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let lateCount = 0;
    let participationSum = 0;
    let recordedSessionCount = 0;

    const sessionHistory: {
      sessionId: string;
      weekNumber: number;
      date: string;
      status: AttendanceStatus;
      participationScore: number;
    }[] = [];

    sortedSessions.forEach((sess) => {
      const sessionRecs = recordsBySession.get(sess.id) || [];
      const rec = sessionRecs.find((r) => r.studentId === student.id);
      if (rec) {
        recordedSessionCount++;
        sessionHistory.push({
          sessionId: sess.id,
          weekNumber: sess.weekNumber,
          date: sess.date,
          status: rec.status,
          participationScore: rec.participationScore,
        });

        if (rec.status === 'present') attendedCount++;
        else if (rec.status === 'late') {
          attendedCount += 0.8; // Late still counts mostly toward presence
          lateCount++;
        } else if (rec.status === 'leave') {
          leaveCount++;
        } else if (rec.status === 'absent') {
          absentCount++;
        }
        participationSum += rec.participationScore || 0;
      }
    });

    const totalSessions = recordedSessionCount;
    const attendanceRate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 100;
    const participationAverage = totalSessions > 0 ? Number((participationSum / totalSessions).toFixed(1)) : 0;

    // Check consecutive absences from end of sessionHistory (current consecutive)
    let consecutiveAbsences = 0;
    for (let i = sessionHistory.length - 1; i >= 0; i--) {
      if (sessionHistory[i].status === 'absent') {
        consecutiveAbsences++;
      } else {
        break;
      }
    }

    // Max consecutive absences across entire term
    let maxConsecutive = 0;
    let currentStreak = 0;
    sessionHistory.forEach((item) => {
      if (item.status === 'absent') {
        currentStreak++;
        if (currentStreak > maxConsecutive) maxConsecutive = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    // Alert if missed > 2 times consecutively (>= 3 or >= 2 in consecutive order)
    // User requested: "แจ้งเตือนผู้ที่ขาดเกิน 2 ครั้งติดกัน" -> 3 or more consecutive absences
    const isConsecutiveRisk = consecutiveAbsences >= 2 || maxConsecutive >= 2;

    // Grouping criteria:
    // ปกติ: 80% ขึ้นไป
    // เฝ้าระวัง: 60-79%
    // เสี่ยง: ต่ำกว่า 60%
    let riskGroup: 'normal' | 'warning' | 'critical' = 'normal';
    if (attendanceRate < 60 || consecutiveAbsences >= 3) {
      riskGroup = 'critical';
    } else if (attendanceRate < 80 || consecutiveAbsences >= 2) {
      riskGroup = 'warning';
    }

    return {
      student,
      totalSessions,
      attendedCount: Math.round(attendedCount * 10) / 10,
      absentCount,
      leaveCount,
      lateCount,
      attendanceRate,
      participationTotal: participationSum,
      participationAverage,
      consecutiveAbsences,
      maxConsecutiveAbsences: maxConsecutive,
      isConsecutiveRisk,
      riskGroup,
      sessionRecords: sessionHistory,
    };
  });

  // Calculate Weekly Trends
  const weeklyTrends: WeeklyTrend[] = sortedSessions.map((sess) => {
    const recs = recordsBySession.get(sess.id) || [];
    const total = students.length;
    let pres = 0;
    let late = 0;
    let leave = 0;
    let abs = 0;
    let partSum = 0;

    recs.forEach((r) => {
      if (r.status === 'present') pres++;
      else if (r.status === 'late') late++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'absent') abs++;
      partSum += r.participationScore || 0;
    });

    const attended = pres + late * 0.8;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
    const avgPart = recs.length > 0 ? Number((partSum / recs.length).toFixed(1)) : 0;

    return {
      sessionId: sess.id,
      weekNumber: sess.weekNumber,
      date: sess.date,
      topic: sess.topic,
      totalEnrolled: total,
      presentCount: pres,
      lateCount: late,
      leaveCount: leave,
      absentCount: abs,
      attendanceRate: rate,
      avgParticipation: avgPart,
    };
  });

  // Overall attendance rate
  let totalPossible = 0;
  let totalAttended = 0;
  let overallPartSum = 0;
  let totalRecordsCount = 0;

  studentAnalysisList.forEach((st) => {
    totalPossible += st.totalSessions;
    totalAttended += st.attendedCount;
    overallPartSum += st.participationTotal;
    totalRecordsCount += st.totalSessions;
  });

  const overallAttendanceRate =
    totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 100;
  const avgParticipationScore =
    totalRecordsCount > 0 ? Number((overallPartSum / totalRecordsCount).toFixed(1)) : 0;

  // Identify lowest and highest attendance weeks
  let lowestWeek: WeeklyTrend | undefined = undefined;
  let highestWeek: WeeklyTrend | undefined = undefined;

  if (weeklyTrends.length > 0) {
    const sortedByRate = [...weeklyTrends].sort((a, b) => a.attendanceRate - b.attendanceRate);
    lowestWeek = sortedByRate[0];
    highestWeek = sortedByRate[sortedByRate.length - 1];
  }

  const consecutiveAbsentStudents = studentAnalysisList.filter((s) => s.isConsecutiveRisk);
  const normalCount = studentAnalysisList.filter((s) => s.riskGroup === 'normal').length;
  const warningCount = studentAnalysisList.filter((s) => s.riskGroup === 'warning').length;
  const criticalCount = studentAnalysisList.filter((s) => s.riskGroup === 'critical').length;

  return {
    totalStudents: students.length,
    totalSessions: sortedSessions.length,
    overallAttendanceRate,
    avgParticipationScore,
    lowestWeek: lowestWeek
      ? {
          weekNumber: lowestWeek.weekNumber,
          date: lowestWeek.date,
          attendanceRate: lowestWeek.attendanceRate,
          topic: lowestWeek.topic,
        }
      : undefined,
    highestWeek: highestWeek
      ? {
          weekNumber: highestWeek.weekNumber,
          date: highestWeek.date,
          attendanceRate: highestWeek.attendanceRate,
        }
      : undefined,
    consecutiveAbsentStudents,
    normalCount,
    warningCount,
    criticalCount,
    weeklyTrends,
  };
}

// ----------------- SAMPLE SEED DATA GENERATOR -----------------
export async function seedSampleCourseData(ownerUid: string, ownerEmail?: string): Promise<Course[]> {
  const courseId = `course-sample-cs201-${Date.now().toString().slice(-4)}`;
  const sampleCourse: Course = {
    id: courseId,
    code: 'CS204',
    name: 'การเขียนโปรแกรมเว็บและโมบายแอปพลิเคชัน (Web & Mobile App Development)',
    term: 'ภาคเรียนที่ 2',
    academicYear: '2567',
    ownerUid,
    ownerEmail: ownerEmail || 'instructor@university.ac.th',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const studentTemplates = [
    { code: '660701001', name: 'กิตติศักดิ์ พัฒนสุข', nickname: 'ก้อง', group: 'กลุ่ม 1' },
    { code: '660701002', name: 'จิราภรณ์ วงศ์สว่าง', nickname: 'แนน', group: 'กลุ่ม 1' },
    { code: '660701003', name: 'ชนาธิป ปรีชากุล', nickname: 'บอย', group: 'กลุ่ม 1' },
    { code: '660701004', name: 'ณัฐนันท์ สุวรรณโชติ', nickname: 'นัท', group: 'กลุ่ม 1' },
    { code: '660701005', name: 'ธนกฤต เมธาพร', nickname: 'มาร์ค', group: 'กลุ่ม 1' },
    { code: '660701006', name: 'ธีรเดช รัตนศิลป์', nickname: 'พีท', group: 'กลุ่ม 2' },
    { code: '660701007', name: 'นภัสสร อริยเมธ', nickname: 'มิ้นต์', group: 'กลุ่ม 2' },
    { code: '660701008', name: 'ปภังกร บุญส่ง', nickname: 'กรณ์', group: 'กลุ่ม 2' },
    { code: '660701009', name: 'ปิยะดา รุ่งอรุณ', nickname: 'ฝ้าย', group: 'กลุ่ม 2' },
    { code: '660701010', name: 'พงศธร เกียรติอนันต์', nickname: 'ไอซ์', group: 'กลุ่ม 2' },
    { code: '660701011', name: 'พิชญาภา ดำรงเกียรติ', nickname: 'พลอย', group: 'กลุ่ม 3' },
    { code: '660701012', name: 'ภัทรดนัย สินธุวัฒน์', nickname: 'ภูมิ', group: 'กลุ่ม 3' },
    { code: '660701013', name: 'มณฑล วรเกียรติ', nickname: 'ท็อป', group: 'กลุ่ม 3' },
    { code: '660701014', name: 'รชต ชัยสมบูรณ์', nickname: 'โอ๊ต', group: 'กลุ่ม 3' },
    { code: '660701015', name: 'วรกานต์ วงศ์มณี (ขาด 3 สัปดาห์ติด)', nickname: 'ว่าน', group: 'กลุ่ม 3' },
    { code: '660701016', name: 'ศิริพร บุญเสริม', nickname: 'แพรว', group: 'กลุ่ม 4' },
    { code: '660701017', name: 'ศุภกฤต จารุพัฒน์', nickname: 'อาร์ม', group: 'กลุ่ม 4' },
    { code: '660701018', name: 'สิรวิชญ์ ธนกุล', nickname: 'วิน', group: 'กลุ่ม 4' },
    { code: '660701019', name: 'อนัญญา ฤทธิชัย', nickname: 'เกรซ', group: 'กลุ่ม 4' },
    { code: '660701020', name: 'อัครพล ชนะเกียรติ', nickname: 'เต้', group: 'กลุ่ม 4' },
    { code: '660701021', name: 'อภิชญา พงษ์ไพโรจน์', nickname: 'มิลค์', group: 'กลุ่ม 5' },
    { code: '660701022', name: 'กานต์รวี เจริญผล', nickname: 'บีม', group: 'กลุ่ม 5' },
    { code: '660701023', name: 'ดนัย สันติเวช', nickname: 'ดอม', group: 'กลุ่ม 5' },
    { code: '660701024', name: 'เปรมปรีดา น้อมจิต', nickname: 'พรีม', group: 'กลุ่ม 5' },
  ];

  const students: Student[] = studentTemplates.map((s, idx) => ({
    id: `std-${idx + 1}`,
    courseId,
    studentCode: s.code,
    name: s.name,
    nickname: s.nickname,
    email: `${s.code}@student.university.ac.th`,
    group: s.group,
    ownerUid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const sessionTopics = [
    { week: 1, date: '2026-09-08', topic: 'สัปดาห์ที่ 1: แนะนำวิชาและเครื่องมือ React + Tailwind' },
    { week: 2, date: '2026-09-15', topic: 'สัปดาห์ที่ 2: Components, Props, และ State Management' },
    { week: 3, date: '2026-09-22', topic: 'สัปดาห์ที่ 3: Hook & Event Handling ในงานจริง' },
    { week: 4, date: '2026-09-29', topic: 'สัปดาห์ที่ 4: การเชื่อมต่อ Cloud Firestore Database (ฝนตกหนักเข้าเรียนต่ำสุด)' },
    { week: 5, date: '2026-10-06', topic: 'สัปดาห์ที่ 5: Authentication & Realtime Synchronous Data' },
    { week: 6, date: '2026-10-13', topic: 'สัปดาห์ที่ 6: ออกแบบ Dashboard & Data Visualization' },
    { week: 7, date: '2026-10-20', topic: 'สัปดาห์ที่ 7: สอบกลางภาค Mini-Project Presentations' },
  ];

  const sessions: AttendanceSession[] = sessionTopics.map((s, sIdx) => ({
    id: `sess-${sIdx + 1}`,
    courseId,
    weekNumber: s.week,
    date: s.date,
    topic: s.topic,
    ownerUid,
    totalStudents: students.length,
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    lateCount: 0,
    avgParticipation: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Generate realistic attendance records
  // Student 15 (660701015) is absent on weeks 4, 5, 6 (3 weeks consecutive!)
  // Week 4 has the lowest attendance (many absentees e.g. rain/bad weather)
  sessions.forEach((sess, sIdx) => {
    let pres = 0;
    let abs = 0;
    let leave = 0;
    let late = 0;
    let partSum = 0;

    const records: AttendanceRecord[] = students.map((std, stIdx) => {
      let status: AttendanceStatus = 'present';
      let partScore = (stIdx % 3) + 1; // 1, 2, or 3
      const tags: string[] = [];

      // student 15 consecutive absent on weeks 4, 5, 6
      if (stIdx === 14 && sIdx >= 3 && sIdx <= 5) {
        status = 'absent';
        partScore = 0;
      }
      // student 8 has some leaves
      else if (stIdx === 7 && (sIdx === 2 || sIdx === 4)) {
        status = 'leave';
        partScore = 0;
      }
      // student 12 is frequently late
      else if (stIdx === 11 && sIdx % 2 === 1) {
        status = 'late';
        partScore = 1;
        tags.push('ตอบคำถาม');
      }
      // Week 4 lowest attendance (drop in attendance)
      else if (sIdx === 3 && (stIdx === 2 || stIdx === 5 || stIdx === 10 || stIdx === 18)) {
        status = 'absent';
        partScore = 0;
      } else {
        // High attendance with lively participation
        const rand = (stIdx * 7 + sIdx * 13) % 10;
        if (rand === 0) {
          status = 'absent';
          partScore = 0;
        } else if (rand === 1) {
          status = 'late';
          partScore = 1;
          tags.push('ทำงานกลุ่ม');
        } else if (rand === 2) {
          status = 'leave';
          partScore = 0;
        } else {
          status = 'present';
          if (partScore === 3) tags.push('ตอบคำถาม', 'นำเสนอ');
          else if (partScore === 2) tags.push('กิจกรรมกลุ่ม');
          else tags.push('มีส่วนร่วม');
        }
      }

      if (status === 'present') pres++;
      else if (status === 'late') late++;
      else if (status === 'leave') leave++;
      else if (status === 'absent') abs++;

      partSum += partScore;

      return {
        id: `rec-${sess.id}-${std.id}`,
        sessionId: sess.id,
        courseId,
        studentId: std.id,
        studentCode: std.studentCode,
        studentName: std.name,
        status,
        participationScore: partScore,
        participationTags: tags,
        note: status === 'leave' ? 'แจ้งลากิจล่วงหน้า' : status === 'absent' && stIdx === 14 ? 'ติดต่อผู้ปกครองไม่ได้' : '',
        ownerUid,
        updatedAt: new Date().toISOString(),
      };
    });

    sess.presentCount = pres;
    sess.absentCount = abs;
    sess.leaveCount = leave;
    sess.lateCount = late;
    sess.avgParticipation = Number((partSum / students.length).toFixed(1));

    // Save records
    setLocal(`records_${courseId}_${sess.id}`, records);
  });

  // Save in local storage
  const existingCourses = getLocal<Course[]>(`courses_${ownerUid}`, []);
  const updatedCourses = [sampleCourse, ...existingCourses];
  setLocal(`courses_${ownerUid}`, updatedCourses);
  setLocal(`students_${courseId}`, students);
  setLocal(`sessions_${courseId}`, sessions);

  // If real user (non-demo), write to Firestore as well!
  if (!isDemo(ownerUid)) {
    try {
      await saveCourse(sampleCourse);
      await saveStudentsBatch(courseId, students, ownerUid);
      for (const s of sessions) {
        await saveSession(s);
        const recs = getLocal<AttendanceRecord[]>(`records_${courseId}_${s.id}`, []);
        await saveAttendanceRecordsBatch(courseId, s.id, recs, s, ownerUid);
      }
    } catch (e) {
      console.warn('Sample seed to Firestore note:', e);
    }
  }

  return updatedCourses;
}
