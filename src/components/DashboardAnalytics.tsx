import React, { useState } from 'react';
import { CourseAnalytics, StudentAnalysis, RiskGroup } from '../types';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Users,
  Calendar,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  BarChart,
  ChevronRight,
  Info,
} from 'lucide-react';

interface DashboardAnalyticsProps {
  analytics: CourseAnalytics;
  studentAnalyses: StudentAnalysis[];
  courseCode: string;
  courseName: string;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  analytics,
  studentAnalyses,
  courseCode,
  courseName,
}) => {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | RiskGroup | 'consecutive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter students for table
  const filteredStudents = studentAnalyses.filter((item) => {
    // Search filter
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.student.studentCode.toLowerCase().includes(q) ||
      item.student.name.toLowerCase().includes(q) ||
      (item.student.nickname && item.student.nickname.toLowerCase().includes(q));

    if (!matchSearch) return false;

    // Risk filter
    if (selectedRiskFilter === 'all') return true;
    if (selectedRiskFilter === 'consecutive') return item.isConsecutiveRisk;
    return item.riskGroup === selectedRiskFilter;
  });

  // Export CSV Function
  const handleExportCSV = () => {
    const headers = [
      'รหัสนักศึกษา',
      'ชื่อ-นามสกุล',
      'กลุ่ม',
      'คาบทั้งหมด',
      'มา (ครั้ง)',
      'สาย (ครั้ง)',
      'ลา (ครั้ง)',
      'ขาด (ครั้ง)',
      'ร้อยละการเข้าเรียน (%)',
      'คะแนนการมีส่วนร่วมเฉลี่ย (0-3)',
      'ขาดติดต่อกันปัจจุบัน (ครั้ง)',
      'สถานะความเสี่ยง',
    ];

    const rows = studentAnalyses.map((s) => [
      `"${s.student.studentCode}"`,
      `"${s.student.name}"`,
      `"${s.student.group || '-'}"`,
      s.totalSessions,
      s.attendedCount,
      s.lateCount,
      s.leaveCount,
      s.absentCount,
      `${s.attendanceRate}%`,
      s.participationAverage,
      s.consecutiveAbsences,
      s.riskGroup === 'normal'
        ? 'ปกติ (80%+)'
        : s.riskGroup === 'warning'
        ? 'เฝ้าระวัง (60-79%)'
        : 'เสี่ยง (<60% หรือขาดติดกัน)',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `รายงานการเข้าเรียน_${courseCode}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate SVG line chart coordinates for weekly trends
  const trendPoints = analytics.weeklyTrends;
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 25;

  const pointsString = trendPoints
    .map((pt, idx) => {
      const x =
        trendPoints.length === 1
          ? chartWidth / 2
          : paddingX + (idx / (trendPoints.length - 1)) * (chartWidth - paddingX * 2);
      // y: 0% is at chartHeight - paddingY, 100% is at paddingY
      const y = chartHeight - paddingY - (pt.attendanceRate / 100) * (chartHeight - paddingY * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-5 pb-20">
      {/* Top Banner: Consecutive Absence Warnings */}
      {analytics.consecutiveAbsentStudents.length > 0 && (
        <div className="bg-gradient-to-r from-rose-500 to-red-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-rose-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/20 shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-base sm:text-lg mb-1 flex items-center gap-2">
                <span>แจ้งเตือน: พบผู้เรียนขาดเรียนเกิน 2 ครั้งติดต่อกัน ({analytics.consecutiveAbsentStudents.length} คน)</span>
              </div>
              <p className="text-rose-100 text-xs sm:text-sm mb-3">
                ผู้เรียนที่ห่างหายติดต่อกันมีความเสี่ยงสูงที่จะหมดสิทธิ์สอบหรือไม่สามารถตามเนื้อหาทัน ควรติดต่อติดตามรายบุคคลทันที
              </p>
              <div className="flex flex-wrap gap-2">
                {analytics.consecutiveAbsentStudents.map((st) => (
                  <span
                    key={st.student.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/25 text-white text-xs font-semibold"
                  >
                    <span className="font-mono">{st.student.studentCode}</span>
                    <span>{st.student.name}</span>
                    <span className="bg-white/20 px-1.5 py-0.2 rounded text-[11px]">
                      ขาด {st.consecutiveAbsences || st.maxConsecutiveAbsences} สัปดาห์ติด
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Overall Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>การเข้าเรียนเฉลี่ย</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {analytics.overallAttendanceRate}%
            </span>
            <span
              className={`text-xs font-semibold ${
                analytics.overallAttendanceRate >= 80 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {analytics.overallAttendanceRate >= 80 ? 'เกณฑ์ปกติ' : 'ต้องปรับปรุง'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                analytics.overallAttendanceRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, analytics.overallAttendanceRate)}%` }}
            />
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>ผู้เรียนทั้งหมด</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {analytics.totalStudents}
            </span>
            <span className="text-xs text-slate-500 font-medium">คนในชั้นเรียน</span>
          </div>
          <div className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>เช็กแล้ว {analytics.totalSessions} สัปดาห์</span>
          </div>
        </div>

        {/* Avg Participation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>การมีส่วนร่วมเฉลี่ย</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              {analytics.avgParticipationScore}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 3.0 ดาว</span>
          </div>
          <div className="text-xs text-slate-500 mt-3 truncate">
            {analytics.avgParticipationScore >= 2.0
              ? 'ห้องเรียนมีส่วนร่วมสูงมาก'
              : analytics.avgParticipationScore >= 1.0
              ? 'มีการตอบคำถามปานกลาง'
              : 'ควรเพิ่มกิจกรรมกระตุ้น'}
          </div>
        </div>

        {/* Risk Breakdown Counts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>การแบ่งกลุ่มความเสี่ยง</span>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 text-center bg-emerald-50 rounded-lg p-1 border border-emerald-100">
              <div className="text-[10px] text-emerald-700 font-medium">ปกติ</div>
              <div className="text-sm font-bold text-emerald-800">{analytics.normalCount}</div>
            </div>
            <div className="flex-1 text-center bg-amber-50 rounded-lg p-1 border border-amber-100">
              <div className="text-[10px] text-amber-700 font-medium">เฝ้าระวัง</div>
              <div className="text-sm font-bold text-amber-800">{analytics.warningCount}</div>
            </div>
            <div className="flex-1 text-center bg-rose-50 rounded-lg p-1 border border-rose-100">
              <div className="text-[10px] text-rose-700 font-medium">เสี่ยง</div>
              <div className="text-sm font-bold text-rose-800">{analytics.criticalCount}</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 text-center">
            เกณฑ์: ปกติ ≥80% | เสี่ยง &lt;60%
          </div>
        </div>
      </div>

      {/* HIGHLIGHT: Lowest Attendance Week Banner */}
      {analytics.lowestWeek && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                ช่วงเวลาที่การเข้าเรียนลดลงต่ำสุด (Drop-off Week)
              </div>
              <div className="font-bold text-slate-900 text-sm sm:text-base">
                สัปดาห์ที่ {analytics.lowestWeek.weekNumber} ({analytics.lowestWeek.date}) — เข้าเรียน {analytics.lowestWeek.attendanceRate}%
              </div>
              {analytics.lowestWeek.topic && (
                <div className="text-xs text-slate-600 mt-0.5">
                  หัวข้อ: {analytics.lowestWeek.topic}
                </div>
              )}
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-semibold text-amber-800 shrink-0">
            จุดที่นักศึกษาห่างหายมากที่สุด
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Attendance Trend Line Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>แนวโน้มการเข้าเรียนรายสัปดาห์</span>
              </h3>
              <p className="text-slate-500 text-xs">อัตราการเข้าเรียนจริงแต่ละสัปดาห์ (%)</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-lg border border-indigo-100">
              เส้นเกณฑ์ 80%
            </span>
          </div>

          {trendPoints.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
              ยังไม่มีข้อมูลสัปดาห์ที่บันทึก
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-48 select-none"
              >
                {/* 80% Benchmark Reference Line */}
                <line
                  x1={paddingX}
                  y1={chartHeight - paddingY - 0.8 * (chartHeight - paddingY * 2)}
                  x2={chartWidth - paddingX}
                  y2={chartHeight - paddingY - 0.8 * (chartHeight - paddingY * 2)}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />
                <text
                  x={chartWidth - paddingX + 5}
                  y={chartHeight - paddingY - 0.8 * (chartHeight - paddingY * 2) + 4}
                  fill="#10b981"
                  fontSize="10"
                  fontWeight="bold"
                >
                  80%
                </text>

                {/* 60% Critical Line */}
                <line
                  x1={paddingX}
                  y1={chartHeight - paddingY - 0.6 * (chartHeight - paddingY * 2)}
                  x2={chartWidth - paddingX}
                  y2={chartHeight - paddingY - 0.6 * (chartHeight - paddingY * 2)}
                  stroke="#f43f5e"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                  opacity="0.6"
                />

                {/* Trend Polyline */}
                {trendPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsString}
                  />
                )}

                {/* Trend Data Circles */}
                {trendPoints.map((pt, idx) => {
                  const x =
                    trendPoints.length === 1
                      ? chartWidth / 2
                      : paddingX + (idx / (trendPoints.length - 1)) * (chartWidth - paddingX * 2);
                  const y =
                    chartHeight - paddingY - (pt.attendanceRate / 100) * (chartHeight - paddingY * 2);

                  const isLowest = pt.weekNumber === analytics.lowestWeek?.weekNumber;

                  return (
                    <g key={pt.sessionId}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isLowest ? '6' : '4.5'}
                        fill={isLowest ? '#f59e0b' : '#4f46e5'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={y - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill={isLowest ? '#d97706' : '#1e293b'}
                      >
                        {pt.attendanceRate}%
                      </text>
                      <text
                        x={x}
                        y={chartHeight - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                      >
                        ส.{pt.weekNumber}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Participation Distribution & Activities Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>คะแนนการมีส่วนร่วมรายสัปดาห์</span>
              </h3>
              <p className="text-slate-500 text-xs">คะแนนเฉลี่ยต่อคน (0 - 3 ดาว)</p>
            </div>
          </div>

          <div className="space-y-3">
            {trendPoints.map((pt) => {
              const scoreRatio = (pt.avgParticipation / 3) * 100;
              return (
                <div key={pt.sessionId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      สัปดาห์ที่ {pt.weekNumber} ({pt.date})
                    </span>
                    <span className="font-bold text-amber-600 flex items-center gap-1">
                      <span>{pt.avgParticipation}</span>
                      <span className="text-[10px] text-slate-400">/ 3.0</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, scoreRatio))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Student Roster Table & Risk Classification Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header and Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>สรุปการเข้าเรียนรายบุคคล & สถานะความเสี่ยง</span>
            </h3>
            <p className="text-slate-500 text-xs">
              คำนวณร้อยละสะสม และประเมินสิทธิ์การสอบตามเกณฑ์มหาวิทยาลัย
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหารหัส/ชื่อ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-48"
              />
            </div>

            {/* Risk Filters */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setSelectedRiskFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  selectedRiskFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                ทั้งหมด
              </button>

              <button
                onClick={() => setSelectedRiskFilter('normal')}
                className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                  selectedRiskFilter === 'normal'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>ปกติ</span>
              </button>

              <button
                onClick={() => setSelectedRiskFilter('warning')}
                className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                  selectedRiskFilter === 'warning'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>เฝ้าระวัง</span>
              </button>

              <button
                onClick={() => setSelectedRiskFilter('critical')}
                className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                  selectedRiskFilter === 'critical'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>เสี่ยง</span>
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer ml-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                <th className="py-2.5 px-3">รหัสนักศึกษา</th>
                <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                <th className="py-2.5 px-3 text-center">สถิติ (มา/สาย/ลา/ขาด)</th>
                <th className="py-2.5 px-3 text-center">ร้อยละเข้าเรียน</th>
                <th className="py-2.5 px-3 text-center">มีส่วนร่วม</th>
                <th className="py-2.5 px-3 text-center">ขาดติดกัน</th>
                <th className="py-2.5 px-3 text-center">สถานะกลุ่ม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    ไม่พบข้อมูลนักศึกษาในตัวกรองนี้
                  </td>
                </tr>
              ) : (
                filteredStudents.map((item) => (
                  <tr
                    key={item.student.id}
                    className={`hover:bg-slate-50/80 transition ${
                      item.isConsecutiveRisk ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {item.student.studentCode}
                    </td>

                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div>
                        {item.student.name}
                        {item.student.nickname && (
                          <span className="text-slate-400 text-xs ml-1">({item.student.nickname})</span>
                        )}
                      </div>
                      {item.student.group && (
                        <div className="text-[10px] text-slate-400">{item.student.group}</div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-medium">
                      <div className="inline-flex items-center gap-1.5 text-xs bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                        <span className="text-emerald-700 font-bold">{item.attendedCount}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-amber-600">{item.lateCount}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-sky-600">{item.leaveCount}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-rose-600 font-bold">{item.absentCount}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span
                          className={`font-bold ${
                            item.attendanceRate >= 80
                              ? 'text-emerald-600'
                              : item.attendanceRate >= 60
                              ? 'text-amber-600'
                              : 'text-rose-600 font-extrabold'
                          }`}
                        >
                          {item.attendanceRate}%
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                        <Award className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{item.participationAverage}</span>
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {item.consecutiveAbsences > 0 ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.consecutiveAbsences >= 2
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.consecutiveAbsences} ครั้งติด
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {item.riskGroup === 'normal' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>ปกติ</span>
                        </span>
                      ) : item.riskGroup === 'warning' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-xs border border-amber-200">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span>เฝ้าระวัง</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>เสี่ยง</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
