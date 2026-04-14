import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Shield, User, Search, ShieldCheck, UserCog, UserMinus, Ban, Unlock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  photoURL?: string;
  isBlocked?: boolean;
}

export default function AdminUsers() {
  const { t, language } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'role' | 'block' | 'delete', user: UserProfile } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(userData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole });
      toast.success(language === 'ar' ? 'تم تحديث الصلاحيات' : 'Role updated');
      fetchUsers();
    } catch (error) {
      toast.error('Error updating role');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleToggleBlock = async (targetUser: UserProfile) => {
    const isBlocked = !targetUser.isBlocked;
    try {
      // 1. Update user profile
      await updateDoc(doc(db, 'users', targetUser.uid), { isBlocked });
      
      // 2. Manage blockedEmails collection for registration prevention
      if (isBlocked) {
        await setDoc(doc(db, 'blockedEmails', targetUser.email.toLowerCase()), {
          email: targetUser.email.toLowerCase(),
          blockedAt: new Date().toISOString(),
          reason: 'Admin block'
        });
      } else {
        await deleteDoc(doc(db, 'blockedEmails', targetUser.email.toLowerCase()));
      }

      toast.success(isBlocked 
        ? (language === 'ar' ? 'تم حظر المستخدم' : 'User blocked') 
        : (language === 'ar' ? 'تم فك الحظر' : 'User unblocked')
      );
      fetchUsers();
    } catch (error) {
      toast.error('Error toggling block');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    try {
      await deleteDoc(doc(db, 'users', targetUser.uid));
      toast.success(language === 'ar' ? 'تم حذف المستخدم' : 'User deleted');
      fetchUsers();
    } catch (error) {
      toast.error('Error deleting user');
    } finally {
      setConfirmAction(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary">{t('admin.users')}</h1>
          <p className="text-on-surface-variant">
            {language === 'ar' ? 'إدارة أعضاء البورد وصلاحيات المستخدمين' : 'Manage board members and user permissions'}
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/10">
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
                <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2">{t('admin.role')}</th>
                <th className="pb-4 font-headline text-xs uppercase tracking-widest text-on-surface-variant/60 px-2 text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant">No users found</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className={`hover:bg-surface-container-low/50 transition-colors group ${u.isBlocked ? 'opacity-60 grayscale' : ''}`}>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 border border-primary/5">
                          <img 
                            src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                            alt={u.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface flex items-center gap-2">
                            {u.name}
                            {u.isBlocked && <Ban className="w-3.5 h-3.5 text-error" />}
                          </p>
                          {u.uid === currentUser?.uid && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">
                              {language === 'ar' ? 'أنت' : 'You'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-on-surface-variant text-sm">{u.email}</td>
                    <td className="py-4 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        u.role === 'admin' 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/20'
                      }`}>
                        {u.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        {u.role === 'admin' ? (language === 'ar' ? 'مسؤول' : 'Admin') : (language === 'ar' ? 'مستخدم' : 'User')}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      {u.uid !== currentUser?.uid && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirmAction({ type: 'role', user: u })}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title={u.role === 'admin' ? t('admin.demote') : t('admin.promote')}
                          >
                            <UserCog className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => setConfirmAction({ type: 'block', user: u })}
                            className={`p-2 rounded-lg transition-all ${u.isBlocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                            title={u.isBlocked ? t('admin.unblock') : t('admin.block')}
                          >
                            {u.isBlocked ? <Unlock className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                          </button>

                          <button
                            onClick={() => setConfirmAction({ type: 'delete', user: u })}
                            className="p-2 text-error hover:bg-error/10 rounded-lg transition-all"
                            title={t('admin.deleteUser')}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmAction(null)}
              className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface-container-lowest rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                confirmAction.type === 'delete' ? 'bg-error/10 text-error' : 
                confirmAction.type === 'block' ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'
              }`}>
                {confirmAction.type === 'delete' ? <Trash2 className="w-8 h-8" /> : 
                 confirmAction.type === 'block' ? <Ban className="w-8 h-8" /> : <UserCog className="w-8 h-8" />}
              </div>
              
              <h3 className="text-xl font-bold text-on-surface mb-2">
                {confirmAction.type === 'delete' ? t('admin.deleteUser') : 
                 confirmAction.type === 'block' ? (confirmAction.user.isBlocked ? t('admin.unblock') : t('admin.block')) : 
                 (confirmAction.user.role === 'admin' ? t('admin.demote') : t('admin.promote'))}
              </h3>
              
              <p className="text-on-surface-variant mb-8">
                {language === 'ar' 
                  ? `هل أنت متأكد من تنفيذ هذا الإجراء على ${confirmAction.user.name}؟`
                  : `Are you sure you want to perform this action on ${confirmAction.user.name}?`}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (confirmAction.type === 'role') handleToggleRole(confirmAction.user);
                    if (confirmAction.type === 'block') handleToggleBlock(confirmAction.user);
                    if (confirmAction.type === 'delete') handleDeleteUser(confirmAction.user);
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${
                    confirmAction.type === 'delete' ? 'bg-error shadow-error/20' : 
                    confirmAction.type === 'block' ? 'bg-amber-600 shadow-amber-600/20' : 'bg-primary shadow-primary/20'
                  }`}
                >
                  {language === 'ar' ? 'تأكيد' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
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

