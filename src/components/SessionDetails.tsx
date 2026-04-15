import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Session, AttendanceRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { FileDown, ArrowLeft, Users, Clock, TrendingUp, Download } from 'lucide-react';
import { motion } from 'motion/react';

interface SessionDetailsProps {
  session: Session;
  onBack: () => void;
}

export const SessionDetails: React.FC<SessionDetailsProps> = ({ session, onBack }) => {
  const { t, language, isRTL } = useLanguage();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, [session.id]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'attendance'), where('sessionId', '==', session.id));
      const querySnapshot = await getDocs(q);
      const attendanceData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      setRecords(attendanceData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const totalCount = records.length;
  const attendanceRate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
  
  const recordsWithDuration = records.filter(r => (r.duration || 0) > 0);
  const avgDuration = recordsWithDuration.length > 0 
    ? recordsWithDuration.reduce((acc, curr) => acc + (curr.duration || 0), 0) / recordsWithDuration.length 
    : 0;

  const pieData = [
    { name: t('admin.present'), value: presentCount, color: '#00666e' },
    { name: t('admin.absent'), value: absentCount, color: '#ba1a1a' },
  ];

  const durationData = [
    { name: '0-10' + t('admin.minutes'), count: records.filter(r => (r.duration || 0) < 10).length },
    { name: '10-30' + t('admin.minutes'), count: records.filter(r => (r.duration || 0) >= 10 && (r.duration || 0) < 30).length },
    { name: '30-60' + t('admin.minutes'), count: records.filter(r => (r.duration || 0) >= 30 && (r.duration || 0) < 60).length },
    { name: '60+' + t('admin.minutes'), count: records.filter(r => (r.duration || 0) >= 60).length },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    const title = `${t('admin.sessions')}: ${session.name}`;
    
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Date: ${session.date} ${session.time || ''}`, 14, 32);
    doc.text(`Total Students: ${totalCount}`, 14, 40);
    doc.text(`Attendance Rate: ${attendanceRate.toFixed(1)}%`, 14, 48);
    doc.text(`Average Watch Time: ${avgDuration.toFixed(1)} minutes`, 14, 56);

    const tableData = records.map(r => [
      r.studentName,
      r.studentEmail,
      r.status === 'present' ? 'PRESENT' : 'ABSENT',
      r.duration ? `${r.duration} min` : '0 min'
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Name', 'Email', 'Status', 'Duration']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: '#00666e' }
    });

    doc.save(`${session.name}_Report.pdf`);
    toast.success(language === 'ar' ? 'تم تحميل التقرير' : 'Report downloaded');
  };

  if (loading) {
    return <div className="py-20 text-center text-on-surface-variant">Loading session details...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold"
        >
          <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('admin.backToSessions')}</span>
        </button>
        
        <button 
          onClick={exportPDF}
          className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-full hover:bg-secondary-container transition-all shadow-lg shadow-secondary/20 font-bold"
        >
          <Download className="w-5 h-5" />
          <span>{t('admin.downloadPDF')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('admin.totalStudents')}</p>
            <p className="text-2xl font-headline font-bold text-on-surface">{totalCount}</p>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-secondary/10 rounded-2xl text-secondary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('admin.attendanceRate')}</p>
            <p className="text-2xl font-headline font-bold text-on-surface">{attendanceRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-tertiary/10 rounded-2xl text-tertiary">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('admin.avgWatchTime')}</p>
            <p className="text-2xl font-headline font-bold text-on-surface">{avgDuration.toFixed(1)} {t('admin.minutes')}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline text-xl font-bold text-on-surface mb-8">{t('admin.distribution')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
          <h3 className="font-headline text-xl font-bold text-on-surface mb-8">{t('admin.watchTimeDist')}</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  interval={0}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  width={40}
                />
                <Tooltip cursor={{fill: 'rgba(0, 102, 110, 0.05)'}} />
                <Bar dataKey="count" fill="#00666e" radius={[4, 4, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline text-xl font-bold text-on-surface">{t('admin.detailedLog')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60">{t('admin.name')}</th>
                <th className="px-6 py-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60">{t('admin.email')}</th>
                <th className="px-6 py-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60">{t('admin.status')}</th>
                <th className="px-6 py-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60">{t('admin.watchTime')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-on-surface">{record.studentName}</td>
                  <td className="px-6 py-4 text-on-surface-variant text-sm">{record.studentEmail}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-error/10 text-error'
                    }`}>
                      {record.status === 'present' ? t('admin.present') : t('admin.absent')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant font-mono text-sm">
                    {record.duration || 0} {t('admin.minutes')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
