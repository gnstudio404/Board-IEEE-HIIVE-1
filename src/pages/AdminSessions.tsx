import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, writeBatch, doc, deleteDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Session, MasterStudent, AttendanceRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Plus, Calendar, FileSpreadsheet, Trash2, CheckCircle, XCircle, Clock, BarChart3, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SessionDetails } from '../components/SessionDetails';

export default function AdminSessions() {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', date: new Date().toISOString().split('T')[0], time: '18:00', description: '' });
  const [uploadingSessionId, setUploadingSessionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    fetchSessions();
  }, [dateFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'sessions'), orderBy('date', 'desc'));
      
      if (dateFilter) {
        q = query(collection(db, 'sessions'), where('date', '>=', dateFilter), orderBy('date', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const sessionData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      setSessions(sessionData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'sessions'), {
        ...newSession,
        createdAt: new Date().toISOString()
      });
      toast.success(language === 'ar' ? 'تمت إضافة الجلسة' : 'Session added');
      setShowAddModal(false);
      fetchSessions();
    } catch (error) {
      toast.error('Error adding session');
    }
  };

  const handleAttendanceUpload = async (sessionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSessionId(sessionId);
    const reader = new FileReader();

    const parseDuration = (durationStr: string): number => {
      if (!durationStr) return 0;
      let totalMinutes = 0;
      
      const hrMatch = durationStr.match(/(\d+)\s*hr/);
      const minMatch = durationStr.match(/(\d+)\s*min/);
      
      if (hrMatch) totalMinutes += parseInt(hrMatch[1]) * 60;
      if (minMatch) totalMinutes += parseInt(minMatch[1]);
      
      if (!hrMatch && !minMatch && !isNaN(Number(durationStr))) {
        return Number(durationStr);
      }
      
      return totalMinutes;
    };

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const sessionData = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' }) as any[];

        const masterSnapshot = await getDocs(collection(db, 'masterStudents'));
        const masterStudents = masterSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MasterStudent[];

        if (masterStudents.length === 0) {
          toast.error(language === 'ar' ? 'القائمة الرئيسية فارغة. يرجى رفع الطلاب أولاً.' : 'Master list is empty. Please upload students first.');
          setUploadingSessionId(null);
          return;
        }

        const batch = writeBatch(db);
        let matchCount = 0;

        for (const master of masterStudents) {
          const attendee = sessionData.find(row => {
            const getVal = (obj: any, key: string) => {
              const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
              return foundKey ? String(obj[foundKey]) : '';
            };

            const rowEmail = getVal(row, 'email').toLowerCase().trim();
            const rowFirstName = getVal(row, 'first name').toLowerCase().trim();
            const rowLastName = getVal(row, 'last name').toLowerCase().trim();
            const rowFullName = `${rowFirstName} ${rowLastName}`.trim();
            
            const masterName = master.name.toLowerCase().trim();
            const masterEmail = master.email.toLowerCase().trim();

            // Email matching with masking support
            let emailMatch = false;
            let emailContradicts = false;

            if (rowEmail) {
              if (rowEmail.includes('*')) {
                const prefix = rowEmail.split('*')[0];
                if (prefix.length >= 3) {
                  if (masterEmail.startsWith(prefix)) {
                    emailMatch = true;
                  } else {
                    emailContradicts = true;
                  }
                }
              } else {
                if (masterEmail.includes(rowEmail) || rowEmail.includes(masterEmail)) {
                  emailMatch = true;
                } else {
                  emailContradicts = true;
                }
              }
            }

            // Name matching
            const nameMatch = (rowFullName && (masterName === rowFullName || masterName.includes(rowFullName))) ||
                             (rowFirstName && rowLastName && masterName.includes(rowFirstName) && masterName.includes(rowLastName));

            // CRITICAL: If email is provided and it contradicts the master email, it's NOT a match
            // even if the name is identical. This handles multiple people with the same name.
            if (emailContradicts) return false;
            
            // If email matches, we trust it
            if (emailMatch) return true;

            // Fallback to name match only if there's no email contradiction
            return nameMatch;
          });

          let isPresent = false;
          let durationMinutes = 0;
          if (attendee) {
            const getVal = (obj: any, key: string) => {
              const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
              return foundKey ? String(obj[foundKey]) : '';
            };
            const durationStr = getVal(attendee, 'duration');
            const timeJoined = getVal(attendee, 'time joined');
            const timeExited = getVal(attendee, 'time exited');
            
            const parseTime = (t: string) => {
              if (!t) return null;
              // Handle Excel numeric time (fraction of a day) if it somehow gets through as a string
              if (!isNaN(Number(t)) && Number(t) < 1) {
                return Math.round(Number(t) * 1440);
              }

              // Match HH:MM AM/PM or HH:MM:SS AM/PM or HH:MM
              const match = t.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
              if (!match) return null;
              
              let hours = parseInt(match[1]);
              const minutes = parseInt(match[2]);
              const ampm = match[3]?.toUpperCase();
              
              if (ampm === 'PM' && hours < 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
              
              return hours * 60 + minutes;
            };

            let calculatedDiff = 0;
            if (timeJoined && timeExited) {
              const joinedMins = parseTime(timeJoined);
              const exitedMins = parseTime(timeExited);
              if (joinedMins !== null && exitedMins !== null) {
                calculatedDiff = exitedMins - joinedMins;
                if (calculatedDiff < 0) calculatedDiff += 1440; // Handle overnight
              }
            }

            const sheetDuration = parseDuration(durationStr);
            // Prioritize calculated difference from the last two columns
            durationMinutes = calculatedDiff > 0 ? calculatedDiff : sheetDuration;
            
            // Requirement: Must be more than 10 minutes for "Present" status
            if (durationMinutes >= 10) {
              isPresent = true;
            }
          }

          const attendanceRef = doc(collection(db, 'attendance'));
          batch.set(attendanceRef, {
            sessionId,
            studentEmail: master.email,
            studentName: master.name,
            status: isPresent ? 'present' : 'absent',
            duration: durationMinutes,
            timestamp: new Date().toISOString()
          });

          if (isPresent) matchCount++;
        }

        await batch.commit();
        toast.success(language === 'ar' ? `تم تسجيل الحضور. الحاضرون (>10 دقائق): ${matchCount} من ${masterStudents.length}` : `Attendance recorded. Present (>10 mins): ${matchCount} of ${masterStudents.length}`);
      } catch (error) {
        toast.error(t('admin.matchError'));
        console.error(error);
      } finally {
        setUploadingSessionId(null);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      toast.error('Error reading file');
      setUploadingSessionId(null);
    };

    reader.readAsBinaryString(file);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      // 1. Delete associated attendance records
      const attendanceQuery = query(collection(db, 'attendance'), where('sessionId', '==', id));
      const attendanceSnap = await getDocs(attendanceQuery);
      
      const batch = writeBatch(db);
      attendanceSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // 2. Delete the session
      batch.delete(doc(db, 'sessions', id));
      
      await batch.commit();
      
      toast.success(language === 'ar' ? 'تم حذف الجلسة وسجلات الحضور المرتبطة بها' : 'Session and associated attendance records deleted');
      setConfirmDeleteId(null);
      fetchSessions();
    } catch (error) {
      toast.error('Error deleting session');
    }
  };

  if (selectedSession) {
    return <SessionDetails session={selectedSession} onBack={() => setSelectedSession(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary">{t('admin.sessions')}</h1>
          <p className="text-on-surface-variant">{language === 'ar' ? 'إدارة جلسات الحضور ورفع الشيتات' : 'Manage attendance sessions and upload sheets'}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Filter className="absolute left-3 w-4 h-4 text-on-surface-variant/50" />
            <input 
              type="date" 
              className="pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/10 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder={t('admin.filterByDate')}
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="ml-2 text-xs text-primary font-bold hover:underline"
              >
                {t('admin.clear')}
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-container transition-all shadow-lg shadow-primary/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>{t('admin.addSession')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-on-surface-variant">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full py-20 text-center text-on-surface-variant">No sessions found</div>
        ) : (
          sessions.map((session) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={session.id}
              className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/5 rounded-xl text-primary">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  {confirmDeleteId === session.id ? (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleDeleteSession(session.id)}
                        className="px-2 py-1 bg-error text-white text-[10px] font-bold rounded hover:bg-error/90"
                      >
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 bg-surface-container-high text-on-surface text-[10px] font-bold rounded"
                      >
                        {language === 'ar' ? 'إلغاء' : 'X'}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmDeleteId(session.id)}
                      className="p-2 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-headline font-bold text-xl text-on-surface mb-1">{session.name}</h3>
              <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
                <Clock className="w-4 h-4" />
                <span>{new Date(session.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'long' })}</span>
              </div>

              {session.description && (
                <p className="text-sm text-on-surface-variant/70 mb-6 line-clamp-2">{session.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                  onClick={() => setSelectedSession(session)}
                  className="flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{t('admin.details')}</span>
                </button>
                <label className="flex items-center justify-center gap-2 py-3 bg-surface-container-low text-on-surface-variant rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors font-bold text-sm border border-outline-variant/10">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{uploadingSessionId === session.id ? (language === 'ar' ? '...' : '...') : t('admin.uploadSession')}</span>
                  <input 
                    type="file" 
                    accept=".csv,.xlsx,.xls" 
                    className="hidden" 
                    onChange={(e) => handleAttendanceUpload(session.id, e)}
                    disabled={uploadingSessionId !== null}
                  />
                </label>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Session Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="font-headline text-2xl font-bold text-primary mb-6">{t('admin.addSession')}</h2>
              <form onSubmit={handleAddSession} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-on-surface-variant ml-1">{t('admin.sessionName')}</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-on-surface-variant ml-1">{t('admin.sessionDate')}</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                      value={newSession.date}
                      onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-on-surface-variant ml-1">{t('admin.sessionTime')}</label>
                    <input 
                      required
                      type="time" 
                      className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                      value={newSession.time}
                      onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-on-surface-variant ml-1">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
                    value={newSession.description}
                    onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 text-on-surface-variant font-bold hover:bg-surface-container-low rounded-xl transition-colors"
                  >
                    {t('admin.cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container transition-colors"
                  >
                    {t('admin.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
