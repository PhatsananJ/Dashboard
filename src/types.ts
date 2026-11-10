export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'late';

export type RiskGroup = 'normal' | 'warning' | 'critical';

export interface Course {
  id: string;
  code: string;
  name: string;
  term: string;
  academicYear: string;
  ownerUid: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  courseId: string;
  studentCode: string;
  name: string;
  nickname?: string;
  email?: string;
  group?: string;
  ownerUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  weekNumber: number;
  date: string;
  topic?: string;
  ownerUid: string;
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  leaveCount?: number;
  lateCount?: number;
  avgParticipation?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  courseId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  status: AttendanceStatus;
  participationScore: number; // 0, 1, 2, 3
  participationTags: string[]; // e.g. 'ตอบคำถาม', 'กิจกรรมกลุ่ม'
  note?: string;
  ownerUid: string;
  updatedAt?: string;
}

export interface StudentAnalysis {
  student: Student;
  totalSessions: number;
  attendedCount: number; // present + late (or 0.5 for late if configured, default: present=1, late=0.8 or 1)
  absentCount: number;
  leaveCount: number;
  lateCount: number;
  attendanceRate: number; // 0 - 100%
  participationTotal: number;
  participationAverage: number; // 0 - 3
  consecutiveAbsences: number; // current consecutive absences from latest recorded sessions
  maxConsecutiveAbsences: number;
  isConsecutiveRisk: boolean; // absent > 2 consecutive times (>= 3 times)
  riskGroup: RiskGroup; // 'normal' (>=80%), 'warning' (60-79%), 'critical' (<60%)
  sessionRecords: {
    sessionId: string;
    weekNumber: number;
    date: string;
    status: AttendanceStatus;
    participationScore: number;
  }[];
}

export interface WeeklyTrend {
  sessionId: string;
  weekNumber: number;
  date: string;
  topic?: string;
  totalEnrolled: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  attendanceRate: number; // %
  avgParticipation: number; // 0 - 3
}

export interface CourseAnalytics {
  totalStudents: number;
  totalSessions: number;
  overallAttendanceRate: number;
  avgParticipationScore: number;
  lowestWeek?: {
    weekNumber: number;
    date: string;
    attendanceRate: number;
    topic?: string;
  };
  highestWeek?: {
    weekNumber: number;
    date: string;
    attendanceRate: number;
  };
  consecutiveAbsentStudents: StudentAnalysis[];
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  weeklyTrends: WeeklyTrend[];
}
