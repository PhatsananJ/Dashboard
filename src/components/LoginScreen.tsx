import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Award, AlertTriangle, TrendingUp, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, signInAsTeacherDemo, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/25 mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            ClassCheck & Engage
          </h1>
          <p className="text-slate-300 text-sm">
            ระบบเช็กชื่อและบันทึกการมีส่วนร่วมในชั้นเรียน สำหรับอาจารย์ผู้สอน
          </p>
        </div>

        {/* Value Highlights */}
        <div className="space-y-3 mb-8 bg-black/20 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <span><strong>Mobile-First Fast-Tap:</strong> ปุ่มใหญ่ เช็กทั้งห้องเสร็จใน 1 นาที</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <span><strong>การมีส่วนร่วม:</strong> บันทึกคะแนน 0-3 ดาว และแท็กกิจกรรมตอบคำถาม</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span><strong>แจ้งเตือนความเสี่ยง:</strong> ตรวจจับผู้ที่ขาดเกิน 2 ครั้งติดต่อกัน</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span><strong>Dashboard รายสัปดาห์:</strong> วิเคราะห์สัปดาห์ที่การเข้าเรียนต่ำสุด</span>
          </div>
        </div>

        {/* Login Buttons */}
        <div className="space-y-3 relative z-10">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 active:scale-[0.98] transition flex items-center justify-center gap-3 shadow-lg shadow-black/20 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>เข้าสู่ระบบด้วย Google Account</span>
          </button>

          <button
            onClick={signInAsTeacherDemo}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-medium active:scale-[0.98] transition flex items-center justify-center gap-2 border border-emerald-400/30 cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>เข้าใช้งานทดสอบทันที (Teacher Demo)</span>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>เชื่อมต่อ Cloud Firestore ข้อมูลปลอดภัย</span>
        </div>
      </div>
    </div>
  );
};
