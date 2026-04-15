import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.sessions': 'Sessions',
    'nav.students': 'Students',
    'nav.attendance': 'Attendance',
    'nav.users': 'Board & Users',
    'nav.home': 'Home',
    'nav.logout': 'Logout',
    'nav.profile': 'Profile',
    'home.welcome': 'Welcome to IEEE HIIVE Board',
    'home.trackProgress': 'Track student attendance and session engagement.',
    'home.adminOnly': 'This section is for Board Admins only.',
    'admin.dashboard': 'Attendance Dashboard',
    'admin.students': 'Master Student List',
    'admin.sessions': 'Attendance Sessions',
    'admin.attendance': 'Attendance Records',
    'admin.uploadMaster': 'Upload Master List',
    'admin.uploadSession': 'Upload Session Sheet',
    'admin.totalStudents': 'Total Students',
    'admin.totalSessions': 'Total Sessions',
    'admin.avgAttendance': 'Avg. Attendance',
    'admin.search': 'Search students...',
    'admin.name': 'Name',
    'admin.email': 'Email',
    'admin.status': 'Status',
    'admin.date': 'Date',
    'admin.actions': 'Actions',
    'admin.save': 'Save',
    'admin.cancel': 'Cancel',
    'admin.delete': 'Delete',
    'admin.addSession': 'Add New Session',
    'admin.sessionName': 'Session Name',
    'admin.sessionDate': 'Session Date',
    'admin.users': 'Board & Registered Users',
    'admin.role': 'Role',
    'admin.promote': 'Promote to Admin',
    'admin.demote': 'Demote to User',
    'admin.block': 'Block User',
    'admin.unblock': 'Unblock User',
    'admin.deleteUser': 'Delete User',
    'admin.matchSuccess': 'Attendance matched successfully!',
    'admin.matchError': 'Error matching attendance.',
    'login.title': 'IEEE HIIVE Board Login',
    'login.subtitle': 'Sign in to manage attendance',
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.signIn': 'Sign In',
    'login.google': 'Sign in with Google',
    'register.title': 'Create Admin Account',
    'register.name': 'Full Name',
    'register.signUp': 'Create Account',
    'register.hasAccount': 'Already have an account?',
    'register.login': 'Login here',
  },
  ar: {
    'nav.dashboard': 'لوحة التحكم',
    'nav.sessions': 'الجلسات',
    'nav.students': 'الطلاب',
    'nav.attendance': 'الحضور',
    'nav.users': 'البورد والمستخدمين',
    'nav.home': 'الرئيسية',
    'nav.logout': 'تسجيل الخروج',
    'nav.profile': 'الملف الشخصي',
    'home.welcome': 'مرحباً بك في IEEE HIIVE Board',
    'home.trackProgress': 'تتبع حضور الطلاب وتفاعلهم في الجلسات.',
    'home.adminOnly': 'هذا القسم مخصص لمسؤولي المجلس فقط.',
    'admin.dashboard': 'لوحة تحكم الحضور',
    'admin.students': 'قائمة الطلاب الرئيسية',
    'admin.sessions': 'جلسات الحضور',
    'admin.attendance': 'سجلات الحضور',
    'admin.uploadMaster': 'رفع القائمة الرئيسية',
    'admin.uploadSession': 'رفع شيت الجلسة',
    'admin.totalStudents': 'إجمالي الطلاب',
    'admin.totalSessions': 'إجمالي الجلسات',
    'admin.avgAttendance': 'متوسط الحضور',
    'admin.search': 'بحث عن طلاب...',
    'admin.name': 'الاسم',
    'admin.email': 'البريد الإلكتروني',
    'admin.status': 'الحالة',
    'admin.date': 'التاريخ',
    'admin.actions': 'الإجراءات',
    'admin.save': 'حفظ',
    'admin.cancel': 'إلغاء',
    'admin.delete': 'حذف',
    'admin.addSession': 'إضافة جلسة جديدة',
    'admin.sessionName': 'اسم الجلسة',
    'admin.sessionDate': 'تاريخ الجلسة',
    'admin.users': 'أعضاء البورد والمستخدمين',
    'admin.role': 'الدور',
    'admin.promote': 'ترقية لمسؤول',
    'admin.demote': 'تنزيل لمستخدم',
    'admin.block': 'حظر المستخدم',
    'admin.unblock': 'فك الحظر',
    'admin.deleteUser': 'حذف المستخدم',
    'admin.matchSuccess': 'تمت مطابقة الحضور بنجاح!',
    'admin.matchError': 'خطأ في مطابقة الحضور.',
    'login.title': 'تسجيل دخول IEEE HIIVE Board',
    'login.subtitle': 'سجل الدخول لإدارة الحضور',
    'login.email': 'البريد الإلكتروني',
    'login.password': 'كلمة المرور',
    'login.signIn': 'تسجيل الدخول',
    'login.google': 'تسجيل الدخول بواسطة جوجل',
    'register.title': 'إنشاء حساب مسؤول',
    'register.name': 'الاسم الكامل',
    'register.signUp': 'إنشاء الحساب',
    'register.hasAccount': 'لديك حساب بالفعل؟',
    'register.login': 'سجل دخول هنا',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
