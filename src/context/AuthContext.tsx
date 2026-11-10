import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, fbSignOut, onAuthStateChanged, User, testConnection } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsTeacherDemo: () => void;
  logout: () => Promise<void>;
  isDemoUser: boolean;
  activeUid: string;
  activeEmail: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local fallback instructor profile for smooth testing inside restricted iframes
const DEMO_TEACHER: any = {
  uid: 'teacher-demo-instructor-01',
  email: 'instructor@university.ac.th',
  displayName: 'อาจารย์ผู้สอน (Instructor)',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(() => {
    return localStorage.getItem('classcheck_is_demo') === 'true';
  });

  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsDemoUser(false);
        localStorage.removeItem('classcheck_is_demo');
      } else {
        const savedDemo = localStorage.getItem('classcheck_is_demo');
        if (savedDemo === 'true') {
          setCurrentUser(DEMO_TEACHER as User);
          setIsDemoUser(true);
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      setIsDemoUser(false);
      localStorage.removeItem('classcheck_is_demo');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      // If popup is blocked by the iframe environment, provide friendly fallback
      alert(`การล็อกอิน Google: ${error.message || 'ไม่สามารถเปิดหน้าต่างยืนยันตัวตนได้ในกรอบพรีวิว กรุณาใช้ปุ่ม "เข้าสู่ระบบทดสอบสำหรับอาจารย์"'}`);
    } finally {
      setLoading(false);
    }
  };

  const signInAsTeacherDemo = () => {
    localStorage.setItem('classcheck_is_demo', 'true');
    setIsDemoUser(true);
    setCurrentUser(DEMO_TEACHER as User);
  };

  const logout = async () => {
    localStorage.removeItem('classcheck_is_demo');
    setIsDemoUser(false);
    if (auth.currentUser) {
      await fbSignOut(auth);
    }
    setCurrentUser(null);
  };

  const activeUid = currentUser?.uid || (isDemoUser ? DEMO_TEACHER.uid : '');
  const activeEmail = currentUser?.email || (isDemoUser ? DEMO_TEACHER.email : '');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        signInWithGoogle,
        signInAsTeacherDemo,
        logout,
        isDemoUser,
        activeUid,
        activeEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
