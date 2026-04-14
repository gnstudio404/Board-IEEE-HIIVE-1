import React, { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, deleteDoc, query, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MasterStudent } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Upload, Trash2, Search, UserPlus, FileText } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminStudents() {
  const { t, language } = useLanguage();
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary">{t('admin.students')}</h1>
          <p className="text-on-surface-variant">{language === 'ar' ? 'إدارة القائمة الرئيسية للطلاب' : 'Manage the master list of students'}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-container transition-colors font-medium shadow-sm">
            <Upload className="w-4 h-4" />
            <span>{uploading ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...') : t('admin.uploadMaster')}</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          
          {showConfirmDelete ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors font-bold shadow-sm"
              >
                {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
              </button>
              <button 
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors font-medium"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors font-medium border border-error/20"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('admin.delete')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/50" />
            <input 
              type="text" 
              placeholder={t('admin.search')}
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{t('admin.name')}</th>
                  <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{t('admin.email')}</th>
                  <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                  <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{language === 'ar' ? 'القسم' : 'Dept'}</th>
                  <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{language === 'ar' ? 'الدور' : 'Role'}</th>
                  <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{language === 'ar' ? 'الفريق' : 'Team'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">Loading...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">No students found</td></tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-surface-container-low/50 transition-colors group">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {student.name.substring(0, 1)}
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-on-surface-variant text-sm">{student.email}</td>
                      <td className="py-4 px-2 text-on-surface-variant text-sm">{student.phone || '-'}</td>
                      <td className="py-4 px-2 text-on-surface-variant text-sm">{student.department || '-'}</td>
                      <td className="py-4 px-2 text-on-surface-variant text-sm">
                        <span className="px-2 py-1 bg-surface-container-low rounded text-[10px] font-bold uppercase tracking-wider">
                          {student.role || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-on-surface-variant text-sm">{student.team || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary text-white rounded-2xl p-6 shadow-lg shadow-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Overview</span>
            </div>
            <p className="text-3xl font-bold mb-1">{students.length}</p>
            <p className="text-white/70 text-sm">{t('admin.totalStudents')}</p>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10">
            <h3 className="font-headline font-bold text-primary mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {language === 'ar' ? 'تعليمات الرفع' : 'Upload Instructions'}
            </h3>
            <ul className="space-y-3 text-sm text-on-surface-variant">
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <span>{language === 'ar' ? 'يجب أن يكون الملف بصيغة Excel (.xlsx, .xls) أو CSV.' : 'File must be in Excel (.xlsx, .xls) or CSV format.'}</span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <span>{language === 'ar' ? 'يجب أن يحتوي على أعمدة "Name" و "Email".' : 'Must contain "Name" and "Email" columns.'}</span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                <span>{language === 'ar' ? 'الأعمدة المطلوبة: Name, Email, Phone, Department, Country, Role, Test Status, Team, Created At' : 'Required columns: Name, Email, Phone, Department, Country, Role, Test Status, Team, Created At'}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
