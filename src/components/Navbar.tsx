import React from 'react';
import { Course } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  BarChart3,
  Users,
  CalendarDays,
  Plus,
  LogOut,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface NavbarProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
  onOpenCreateCourse: () => void;
  activeTab: 'attendance' | 'dashboard' | 'students' | 'sessions';
  onChangeTab: (tab: 'attendance' | 'dashboard' | 'students' | 'sessions') => void;
  onSeedSample: () => void;
  studentCount: number;
  sessionCount: number;
  alertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  courses,
  selectedCourseId,
  onSelectCourse,
  onOpenCreateCourse,
  activeTab,
  onChangeTab,
  onSeedSample,
  studentCount,
  sessionCount,
  alertCount,
}) => {
  const { currentUser, logout, isDemoUser } = useAuth();
  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Course Selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm sm:text-base hidden md:inline tracking-tight">
              ClassCheck
            </span>
          </div>

          {/* Course Selector Dropdown */}
          <div className="flex items-center gap-1.5 flex-1 max-w-xs sm:max-w-sm">
            <div className="relative flex-1 min-w-0">
              <select
                value={selectedCourseId}
                onChange={(e) => onSelectCourse(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs sm:text-sm rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate cursor-pointer font-medium"
              >
                {courses.length === 0 ? (
                  <option value="">-- ยังไม่มีรายวิชา --</option>
                ) : (
                  courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} {course.name} ({course.term})
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={onOpenCreateCourse}
              title="สร้างวิชาใหม่"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSeedSample}
            title="โหลดข้อมูลจำลองชั้นเรียนเพื่อทดสอบ"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 text-xs font-medium transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>โหลดวิชาตัวอย่าง</span>
          </button>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-300">
            <div className="hidden lg:block text-right">
              <div className="font-medium text-white truncate max-w-[120px]">
                {currentUser?.displayName || (isDemoUser ? 'อาจารย์ทดสอบ' : 'อาจารย์')}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {currentUser?.email || (isDemoUser ? 'demo-mode' : '')}
              </div>
            </div>
            <button
              onClick={logout}
              title="ออกจากระบบ"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 border border-slate-700 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs navigation - Mobile touch optimized */}
      <div className="bg-slate-900/95 border-t border-slate-800/80 px-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1.5">
          <button
            onClick={() => onChangeTab('attendance')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>หน้าเช็กชื่อ</span>
          </button>

          <button
            onClick={() => onChangeTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer relative ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard & วิเคราะห์</span>
            {alertCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                {alertCount} เสี่ยง
              </span>
            )}
          </button>

          <button
            onClick={() => onChangeTab('students')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer ${
              activeTab === 'students'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>รายชื่อนักศึกษา</span>
            <span className="text-[11px] opacity-75">({studentCount})</span>
          </button>

          <button
            onClick={() => onChangeTab('sessions')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>สัปดาห์ & คาบเรียน</span>
            <span className="text-[11px] opacity-75">({sessionCount})</span>
          </button>

          <div className="sm:hidden ml-auto">
            <button
              onClick={onSeedSample}
              className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-700/50 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>ตัวอย่าง</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
