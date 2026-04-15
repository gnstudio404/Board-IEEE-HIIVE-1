import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Session, MasterStudent, AttendanceRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  TrendingUp, 
  ArrowUpRight, 
  Clock,
  FileText,
  Activity,
  Download,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    avgAttendance: 0,
    recentAttendance: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [studentsSnap, sessionsSnap, attendanceSnap] = await Promise.all([
        getDocs(collection(db, 'masterStudents')),
        getDocs(collection(db, 'sessions')),
        getDocs(query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(100)))
      ]);

      const totalStudents = studentsSnap.size;
      const totalSessions = sessionsSnap.size;
      const attendance = attendanceSnap.docs.map(doc => doc.data() as AttendanceRecord);
      
      const presentCount = attendance.filter(r => r.status === 'present').length;
      const avgAttendance = attendance.length > 0 ? (presentCount / attendance.length) * 100 : 0;

      setStats({
        totalStudents,
        totalSessions,
        avgAttendance,
        recentAttendance: attendance.slice(0, 5)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'stats');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { 
      title: t('admin.totalStudents'), 
      value: stats.totalStudents, 
      icon: Users, 
      color: 'bg-blue-500',
      trend: '+12%'
    },
    { 
      title: t('admin.totalSessions'), 
      value: stats.totalSessions, 
      icon: Calendar, 
      color: 'bg-purple-500',
      trend: '+2'
    },
    { 
      title: t('admin.avgAttendance'), 
      value: `${stats.avgAttendance.toFixed(1)}%`, 
      icon: CheckCircle, 
      color: 'bg-emerald-500',
      trend: '+5.4%'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary">{t('admin.dashboard')}</h1>
          <p className="text-on-surface-variant">{language === 'ar' ? 'نظرة عامة على أداء الحضور' : 'Overview of attendance performance'}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-xl text-sm font-medium text-on-surface-variant">
          <Clock className="w-4 h-4" />
          <span>{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={card.title}
            className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/10 group hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 ${card.color} text-white rounded-2xl shadow-lg shadow-current/20`}>
                <card.icon className="w-6 h-6" />
              </div>
              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-bold">
                <TrendingUp className="w-3 h-3" />
                {card.trend}
              </span>
            </div>
            <p className="text-on-surface-variant text-sm font-medium mb-1">{card.title}</p>
            <h3 className="text-3xl font-bold text-on-surface">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-headline font-bold text-xl flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {language === 'ar' ? 'نشاط الحضور الأخير' : 'Recent Attendance Activity'}
            </h3>
            <button 
              onClick={() => navigate('/admin/attendance')}
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              {language === 'ar' ? 'عرض الكل' : 'View All'}
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {stats.recentAttendance.length === 0 ? (
              <p className="text-center py-8 text-on-surface-variant">No recent activity</p>
            ) : (
              stats.recentAttendance.map((record, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-2xl border border-outline-variant/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      record.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {record.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{record.studentName}</p>
                      <p className="text-xs text-on-surface-variant">{record.studentEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                      record.status === 'present' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                    }`}>
                      {record.status === 'present' ? (language === 'ar' ? 'حاضر' : 'Present') : (language === 'ar' ? 'غائب' : 'Absent')}
                    </span>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline font-bold text-xl mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
          </h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/admin/students')}
              className="w-full flex items-center justify-between p-4 bg-primary/5 text-primary rounded-2xl hover:bg-primary/10 transition-colors group"
            >
              <span className="font-bold">{t('admin.uploadMaster')}</span>
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/admin/sessions')}
              className="w-full flex items-center justify-between p-4 bg-purple-500/5 text-purple-600 rounded-2xl hover:bg-purple-500/10 transition-colors group"
            >
              <span className="font-bold">{t('admin.addSession')}</span>
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/admin/attendance')}
              className="w-full flex items-center justify-between p-4 bg-emerald-500/5 text-emerald-600 rounded-2xl hover:bg-emerald-500/10 transition-colors group"
            >
              <span className="font-bold">{language === 'ar' ? 'تصدير التقارير' : 'Export Reports'}</span>
              <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </button>
          </div>

          <div className="mt-8 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10">
            <h4 className="font-bold text-sm mb-2">{language === 'ar' ? 'نصيحة النظام' : 'System Tip'}</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {language === 'ar' 
                ? 'يتم احتساب الحضور فقط للطلاب الذين تجاوزت مدة تواجدهم في الجلسة 10 دقائق.' 
                : 'Attendance is only counted for students whose duration in the session exceeds 10 minutes.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
