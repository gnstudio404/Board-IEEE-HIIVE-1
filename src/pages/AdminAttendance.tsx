import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, writeBatch, doc, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AttendanceRecord, Session } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Search, Filter, Download, Users, CheckCircle, XCircle, BarChart3, PieChart as PieChartIcon, Trash2, ChevronDown, ExternalLink, FileText, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AdminAttendance() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsSnap, attendanceSnap] = await Promise.all([
        getDocs(query(collection(db, 'sessions'), orderBy('date', 'desc'))),
        getDocs(query(collection(db, 'attendance'), orderBy('timestamp', 'desc')))
      ]);

      const sessionData = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Session[];
      const attendanceData = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceRecord[];

      setSessions(sessionData);
      setRecords(attendanceData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllAttendance = async () => {
    setLoading(true);
    try {
      const attendanceSnap = await getDocs(collection(db, 'attendance'));
      const docs = attendanceSnap.docs;
      
      // Batch delete in chunks of 500
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      toast.success(language === 'ar' ? 'تم مسح جميع سجلات الحضور بنجاح' : 'All attendance records cleared successfully');
      setShowClearConfirm(false);
      fetchData();
    } catch (error) {
      toast.error('Error clearing attendance');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSession = selectedSession === 'all' || r.sessionId === selectedSession;
    const matchesSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSession && matchesSearch;
  });

  // Analytics Data
  const sessionStats = sessions.map(session => {
    const sessionRecords = records.filter(r => r.sessionId === session.id);
    const present = sessionRecords.filter(r => r.status === 'present').length;
    const total = sessionRecords.length;
    return {
      name: session.name,
      present,
      absent: total - present,
      rate: total > 0 ? (present / total) * 100 : 0
    };
  }).reverse();

  const overallStats = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
  };

  const pieData = [
    { name: language === 'ar' ? 'حاضر' : 'Present', value: overallStats.present, color: '#10b981' },
    { name: language === 'ar' ? 'غائب' : 'Absent', value: overallStats.absent, color: '#ef4444' }
  ];

  // Export Functions
  const exportAttendancePDF = () => {
    const doc = new jsPDF();
    const title = 'Attendance Report'; // Always English
    
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = filteredRecords.map(r => [
      r.studentName,
      r.studentEmail,
      r.status === 'present' ? 'Present' : 'Absent',
      sessions.find(s => s.id === r.sessionId)?.name || 'Unknown'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Name', 'Email', 'Status', 'Session']], // Always English
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: '#3b82f6' }
    });

    doc.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(language === 'ar' ? 'تم تحميل التقرير بنجاح' : 'Report downloaded successfully');
  };

  const exportAttendanceExcel = () => {
    const data = memberStats.map(m => ({
      'Name': m.name,
      'Email': m.email,
      'Sessions Attended': m.present,
      'Sessions Missed': m.total - m.present
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance'); // Always English
    XLSX.writeFile(wb, `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(language === 'ar' ? 'تم تصدير ملف الإكسيل بنجاح' : 'Excel file exported successfully');
  };

  const getMemberStats = () => {
    const memberMap = new Map<string, { name: string, email: string, present: number, total: number }>();
    
    records.forEach(r => {
      const stats = memberMap.get(r.studentEmail) || { name: r.studentName, email: r.studentEmail, present: 0, total: 0 };
      stats.total++;
      if (r.status === 'present') stats.present++;
      memberMap.set(r.studentEmail, stats);
    });

    return Array.from(memberMap.values())
      .map(m => ({ ...m, rate: (m.present / m.total) * 100 }))
      .sort((a, b) => b.rate - a.rate);
  };

  const getMonthlyStats = () => {
    const monthMap = new Map<string, { name: string, present: number, total: number }>();
    
    records.forEach(r => {
      const date = new Date(r.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' });
      
      const stats = monthMap.get(monthKey) || { name: monthName, present: 0, total: 0 };
      stats.total++;
      if (r.status === 'present') stats.present++;
      monthMap.set(monthKey, stats);
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, stats]) => ({
        name: stats.name,
        rate: (stats.present / stats.total) * 100
      }));
  };

  const memberStats = getMemberStats();
  const monthlyStats = getMonthlyStats();
  const topMembers = memberStats.slice(0, 5);
  const weakMembers = [...memberStats].reverse().slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary">{t('admin.attendance')}</h1>
          <p className="text-on-surface-variant">{language === 'ar' ? 'تحليل بيانات الحضور والغياب' : 'Analyze attendance and absence data'}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error rounded-xl hover:bg-error/20 transition-all text-sm font-bold"
          >
            <Trash2 className="w-4 h-4" />
            {language === 'ar' ? 'مسح الكل' : 'Clear All'}
          </button>
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <Filter className="w-4 h-4 text-primary" />
              <div className="w-px h-4 bg-outline-variant/20 mx-1" />
            </div>
            <select 
              className="appearance-none pl-12 pr-10 py-2.5 bg-surface-container-low border border-outline-variant/10 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm font-bold text-on-surface cursor-pointer hover:bg-surface-container-high shadow-sm"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
            >
              <option value="all">{language === 'ar' ? 'جميع الجلسات' : 'All Sessions'}</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-on-surface-variant font-medium">{language === 'ar' ? 'إجمالي السجلات' : 'Total Records'}</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-on-surface-variant font-medium">{language === 'ar' ? 'إجمالي الحضور' : 'Total Present'}</p>
            <p className="text-2xl font-bold">{overallStats.present}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 flex items-center gap-4">
          <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-500">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-on-surface-variant font-medium">{language === 'ar' ? 'إجمالي الغياب' : 'Total Absent'}</p>
            <p className="text-2xl font-bold">{overallStats.absent}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline font-bold text-xl mb-8 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'الحضور لكل جلسة' : 'Attendance per Session'}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline font-bold text-xl mb-8 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'التوزيع العام' : 'Overall Distribution'}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-on-surface-variant">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Options */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline font-bold text-xl mb-6 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
          </h3>
          <div className="space-y-3">
            <button 
              onClick={exportAttendancePDF}
              className="w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-primary/5 rounded-2xl transition-all group border border-outline-variant/5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">{language === 'ar' ? 'تقرير الحضور (PDF)' : 'Attendance Report (PDF)'}</span>
              </div>
              <Download className="w-4 h-4 text-on-surface-variant group-hover:text-primary transition-colors" />
            </button>

            <button 
              onClick={exportAttendanceExcel}
              className="w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-primary/5 rounded-2xl transition-all group border border-outline-variant/5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">{language === 'ar' ? 'أداء الأعضاء (Excel)' : 'Member Performance (Excel)'}</span>
              </div>
              <Download className="w-4 h-4 text-on-surface-variant group-hover:text-primary transition-colors" />
            </button>
          </div>
        </div>

        {/* Top Members */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline font-bold text-xl mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            {language === 'ar' ? 'الأعضاء الأكثر التزاماً' : 'Top Members'}
          </h3>
          <div className="space-y-4">
            {topMembers.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-emerald-500 w-4">#{i+1}</span>
                  <p className="font-bold text-sm truncate w-32">{m.name}</p>
                </div>
                <span className="text-xs font-black bg-emerald-500 text-white px-2 py-1 rounded-lg">{m.rate.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Members */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline font-bold text-xl mb-6 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-500" />
            {language === 'ar' ? 'الأعضاء الأقل التزاماً' : 'Weak Members'}
          </h3>
          <div className="space-y-4">
            {weakMembers.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between p-3 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-rose-500 w-4">#{i+1}</span>
                  <p className="font-bold text-sm truncate w-32">{m.name}</p>
                </div>
                <span className="text-xs font-black bg-rose-500 text-white px-2 py-1 rounded-lg">{m.rate.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 border border-outline-variant/10 shadow-sm">
        <h3 className="font-headline font-bold text-xl mb-8 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {language === 'ar' ? 'الأداء الشهري العام' : 'Overall Monthly Performance'}
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h3 className="font-headline font-bold text-xl">{language === 'ar' ? 'سجلات الطلاب' : 'Student Records'}</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
            <input 
              type="text" 
              placeholder={t('admin.search')}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{t('admin.name')}</th>
                <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{t('admin.email')}</th>
                <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{t('admin.status')}</th>
                <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{language === 'ar' ? 'الجلسة' : 'Session'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant">Loading...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant">No records found</td></tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{record.studentName}</span>
                        <button 
                          onClick={async () => {
                            try {
                              const q = query(collection(db, 'users'), where('email', '==', record.studentEmail), limit(1));
                              const snap = await getDocs(q);
                              if (!snap.empty) {
                                navigate(`/member/${snap.docs[0].id}`);
                              } else {
                                toast.error(language === 'ar' ? 'هذا الطالب لم يسجل حسابه بعد' : 'This student has not registered their account yet');
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="p-1 text-primary hover:bg-primary/10 rounded-full transition-all"
                          title={language === 'ar' ? 'عرض الملف الذكي' : 'View Smart Profile'}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-on-surface-variant text-sm">{record.studentEmail}</td>
                    <td className="py-4 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        record.status === 'present' 
                          ? 'bg-emerald-500/10 text-emerald-600' 
                          : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {record.status === 'present' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {record.status === 'present' ? (language === 'ar' ? 'حاضر' : 'Present') : (language === 'ar' ? 'غائب' : 'Absent')}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-on-surface-variant text-sm">
                      {sessions.find(s => s.id === record.sessionId)?.name || 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface-container-lowest rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-error/10 text-error">
                <Trash2 className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-bold text-on-surface mb-2">
                {language === 'ar' ? 'مسح جميع السجلات؟' : 'Clear All Records?'}
              </h3>
              
              <p className="text-on-surface-variant mb-8">
                {language === 'ar' 
                  ? 'هل أنت متأكد من رغبتك في مسح جميع سجلات الحضور والغياب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.'
                  : 'Are you sure you want to permanently clear all attendance records? This action cannot be undone.'}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleClearAllAttendance}
                  className="flex-1 py-3 rounded-xl font-bold bg-error text-white shadow-lg shadow-error/20 transition-all active:scale-95"
                >
                  {language === 'ar' ? 'تأكيد المسح' : 'Confirm Clear'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
