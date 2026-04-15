import React, { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, deleteDoc, query, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MasterStudent } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, Search, UserPlus, FileText, ExternalLink, Users, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function AdminStudents() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [students, setStudents] = useState<MasterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'masterStudents'));
      const studentData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MasterStudent[];
      setStudents(studentData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'masterStudents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        
        const batch = writeBatch(db);
        
        // Basic validation: check if Name and Email exist (case insensitive check)
        const validData = data.filter(row => {
          const keys = Object.keys(row);
          return keys.some(k => k.toLowerCase() === 'name') && 
                 keys.some(k => k.toLowerCase() === 'email');
        });
        
        if (validData.length === 0) {
          toast.error(language === 'ar' ? 'لم يتم العثور على بيانات صالحة. تأكد من وجود أعمدة Name و Email.' : 'No valid data found. Ensure Name and Email columns exist.');
          setUploading(false);
          return;
        }

        for (const row of validData) {
          // Helper to get value case-insensitively
          const getVal = (obj: any, key: string) => {
            const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
            return foundKey ? obj[foundKey] : '';
          };

          const newDocRef = doc(collection(db, 'masterStudents'));
          batch.set(newDocRef, {
            name: getVal(row, 'name') || '',
            email: getVal(row, 'email') || '',
            phone: getVal(row, 'phone') || '',
            department: getVal(row, 'department') || '',
            country: getVal(row, 'country') || '',
            role: getVal(row, 'role') || '',
            testStatus: getVal(row, 'test status') || '',
            team: getVal(row, 'team') || '',
            createdAt: getVal(row, 'created at') || new Date().toISOString().split('T')[0],
          });
        }

        await batch.commit();
        toast.success(language === 'ar' ? `تم رفع ${validData.length} طالب بنجاح!` : `Uploaded ${validData.length} students successfully!`);
        fetchStudents();
      } catch (error) {
        toast.error(language === 'ar' ? 'خطأ في رفع البيانات' : 'Error uploading data');
        console.error(error);
      } finally {
        setUploading(false);
        // Clear input
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      toast.error('Error reading file');
      setUploading(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleDeleteAll = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'masterStudents'));
      const docs = querySnapshot.docs;
      
      // Delete in batches of 500 (Firestore limit)
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      toast.success(language === 'ar' ? 'تم حذف جميع الطلاب' : 'All students deleted');
      setStudents([]);
      setShowConfirmDelete(false);
    } catch (error) {
      toast.error('Error deleting students');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.team?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl font-black text-primary tracking-tight">{t('admin.students')}</h1>
          <p className="text-on-surface-variant font-medium">{language === 'ar' ? 'إدارة القائمة الرئيسية للطلاب' : 'Manage the master list of students'}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl cursor-pointer hover:bg-primary-container transition-all font-bold shadow-lg shadow-primary/20 active:scale-95">
            <Upload className="w-5 h-5" />
            <span>{uploading ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...') : t('admin.uploadMaster')}</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          
          {showConfirmDelete ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <button 
                onClick={handleDeleteAll}
                className="px-6 py-3 bg-error text-white rounded-2xl hover:bg-error/90 transition-all font-bold shadow-lg shadow-error/20 active:scale-95"
              >
                {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
              </button>
              <button 
                onClick={() => setShowConfirmDelete(false)}
                className="px-6 py-3 bg-surface-container-high text-on-surface rounded-2xl hover:bg-surface-container-highest transition-all font-bold"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-2 px-6 py-3 bg-error/10 text-error rounded-2xl hover:bg-error/20 transition-all font-bold border border-error/20 active:scale-95"
            >
              <Trash2 className="w-5 h-5" />
              <span>{t('admin.delete')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Section: Stats and Instructions Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-primary-container text-white rounded-[2rem] p-8 shadow-xl shadow-primary/10 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <UserPlus size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Users className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Overview</span>
            </div>
            <h3 className="text-6xl font-black mb-2 tracking-tighter">{students.length}</h3>
            <p className="text-white/80 font-bold text-lg">{t('admin.totalStudents')}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-sm border border-outline-variant/10"
        >
          <h3 className="font-headline font-black text-primary text-xl mb-6 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            {language === 'ar' ? 'تعليمات الرفع' : 'Upload Instructions'}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
              <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-black shrink-0 shadow-lg shadow-primary/20">1</span>
              <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                {language === 'ar' ? 'يجب أن يكون الملف بصيغة Excel (.xlsx, .xls) أو CSV.' : 'File must be in Excel (.xlsx, .xls) or CSV format.'}
              </p>
            </div>
            <div className="flex gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
              <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-black shrink-0 shadow-lg shadow-primary/20">2</span>
              <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                {language === 'ar' ? 'يجب أن يحتوي على أعمدة "Name" و "Email".' : 'Must contain "Name" and "Email" columns.'}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest text-center">
            {language === 'ar' ? 'الأعمدة المدعومة: Name, Email, Phone, Dept, Country, Role, Team' : 'Supported columns: Name, Email, Phone, Dept, Country, Role, Team'}
          </p>
        </motion.div>
      </div>

      {/* Bottom Section: Students List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-sm border border-outline-variant/10"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h2 className="text-2xl font-black text-primary tracking-tight flex items-center gap-3">
            <Users className="w-6 h-6" />
            {language === 'ar' ? 'قائمة الطلاب' : 'Students List'}
          </h2>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
            <input 
              type="text" 
              placeholder={t('admin.search')}
              className="w-full pl-12 pr-6 py-4 bg-surface-container-low border-none rounded-[1.5rem] focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-8 px-8">
          <table className={cn(
            "w-full border-separate border-spacing-y-3",
            language === 'ar' ? "text-right" : "text-left"
          )}>
            <thead>
              <tr className="text-on-surface-variant/60">
                <th className="pb-4 font-black text-[10px] uppercase tracking-[0.2em] px-6">{t('admin.name')}</th>
                <th className="pb-4 font-black text-[10px] uppercase tracking-[0.2em] px-6">{t('admin.email')}</th>
                <th className="pb-4 font-black text-[10px] uppercase tracking-[0.2em] px-6">{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                <th className="pb-4 font-black text-[10px] uppercase tracking-[0.2em] px-6">{language === 'ar' ? 'القسم' : 'Dept'}</th>
                <th className="pb-4 font-black text-[10px] uppercase tracking-[0.2em] px-6">{language === 'ar' ? 'الدور' : 'Role'}</th>
                <th className="pb-4 font-black text-[10px] uppercase tracking-[0.2em] px-6">{language === 'ar' ? 'الفريق' : 'Team'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" /></td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-on-surface-variant font-bold">{language === 'ar' ? 'لم يتم العثور على طلاب' : 'No students found'}</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="group transition-all hover:translate-y-[-2px] duration-300">
                    <td className="py-5 px-6 bg-surface-container-low/50 first:rounded-s-[1.5rem] last:rounded-e-[1.5rem] group-hover:bg-surface-container-high transition-colors border-y border-outline-variant/5 first:border-s last:border-e">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shadow-sm shrink-0">
                          {student.name.substring(0, 1)}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-on-surface truncate">{student.name}</span>
                          <button 
                            onClick={async () => {
                              try {
                                const usersRef = collection(db, 'users');
                                const q = query(usersRef, where('email', '==', student.email), limit(1));
                                const snap = await getDocs(q);
                                if (!snap.empty) {
                                  navigate(`/member/${snap.docs[0].id}`);
                                } else {
                                  toast.error(language === 'ar' ? 'هذا الطالب لم يسجل حسابه بعد' : 'This student has not registered their account yet');
                                }
                              } catch (e) {
                                toast.error(language === 'ar' ? 'حدث خطأ أثناء البحث' : 'Error searching for student');
                              }
                            }}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            title={language === 'ar' ? 'عرض الملف الذكي' : 'View Smart Profile'}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 bg-surface-container-low/50 group-hover:bg-surface-container-high transition-colors border-y border-outline-variant/5 text-sm font-medium text-on-surface-variant">{student.email}</td>
                    <td className="py-5 px-6 bg-surface-container-low/50 group-hover:bg-surface-container-high transition-colors border-y border-outline-variant/5 text-sm font-medium text-on-surface-variant">{student.phone || '-'}</td>
                    <td className="py-5 px-6 bg-surface-container-low/50 group-hover:bg-surface-container-high transition-colors border-y border-outline-variant/5 text-sm font-medium text-on-surface-variant">{student.department || '-'}</td>
                    <td className="py-5 px-6 bg-surface-container-low/50 group-hover:bg-surface-container-high transition-colors border-y border-outline-variant/5">
                      <span className="px-3 py-1 bg-surface-container-high rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface border border-outline-variant/10">
                        {student.role || '-'}
                      </span>
                    </td>
                    <td className="py-5 px-6 bg-surface-container-low/50 first:rounded-s-[1.5rem] last:rounded-e-[1.5rem] group-hover:bg-surface-container-high transition-colors border-y border-outline-variant/5 first:border-s last:border-e text-sm font-bold text-primary">
                      {student.team || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
