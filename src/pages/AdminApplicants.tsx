import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserScore, Team } from '../types';
import { toast } from 'sonner';
import { Search, Filter, User, Mail, Building, CheckCircle2, Clock, MoreVertical, ExternalLink, Trash2, AlertTriangle, Phone, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function AdminApplicants() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<UserProfile[]>([]);
  const [scores, setScores] = useState<Record<string, UserScore>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      let usersSnap;
      try {
        usersSnap = await getDocs(collection(db, 'users'));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return;
      }
      const applicantsData = usersSnap.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      
      let scoresSnap;
      try {
        scoresSnap = await getDocs(collection(db, 'scores'));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'scores');
        return;
      }
      const scoresData: Record<string, UserScore> = {};
      scoresSnap.docs.forEach(doc => {
        scoresData[doc.id] = doc.data() as UserScore;
      });

      let teamsSnap;
      try {
        teamsSnap = await getDocs(collection(db, 'teams'));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'teams');
        return;
      }
      const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

      setApplicants(applicantsData);
      setScores(scoresData);
      setTeams(teamsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async (userId: string, newTeamId: string | null) => {
    const user = applicants.find(u => u.uid === userId);
    const oldTeamId = user?.assignedTeamId;

    if (oldTeamId === newTeamId) return;

    try {
      const batch = writeBatch(db);

      // Update user
      batch.update(doc(db, 'users', userId), {
        assignedTeamId: newTeamId
      });

      // Update old team count
      if (oldTeamId) {
        const oldTeam = teams.find(t => t.id === oldTeamId);
        if (oldTeam) {
          batch.update(doc(db, 'teams', oldTeamId), {
            memberCount: Math.max(0, oldTeam.memberCount - 1)
          });
        }
      }

      // Update new team count
      if (newTeamId) {
        const newTeam = teams.find(t => t.id === newTeamId);
        if (newTeam) {
          batch.update(doc(db, 'teams', newTeamId), {
            memberCount: newTeam.memberCount + 1
          });
        }
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'batch-reassign');
        return;
      }
      toast.success("User reassigned successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to reassign user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const user = applicants.find(u => u.uid === userId);
      const batch = writeBatch(db);

      // Delete user document
      batch.delete(doc(db, 'users', userId));

      // Delete score document
      batch.delete(doc(db, 'scores', userId));

      // Update team count if assigned
      if (user?.assignedTeamId) {
        const team = teams.find(t => t.id === user.assignedTeamId);
        if (team) {
          batch.update(doc(db, 'teams', user.assignedTeamId), {
            memberCount: Math.max(0, team.memberCount - 1)
          });
        }
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
        return;
      }
      toast.success("User data deleted successfully");
      setDeletingId(null);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      const errorMessage = error?.message || "Failed to delete user";
      toast.error(`Delete failed: ${errorMessage}`);
    }
  };

  const filteredApplicants = applicants.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'completed' && u.completedTest) || 
                         (filter === 'pending' && !u.completedTest);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-12">
      <section id="users">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-primary font-bold tracking-tight text-sm mb-1 uppercase">{t('admin.identityManagement')}</p>
            <h2 className="text-4xl font-extrabold text-primary tracking-tighter">{t('admin.applicants')}</h2>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-sm">search</span>
              <input 
                className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-sm focus:ring-1 focus:ring-primary w-64 transition-all" 
                placeholder={t('admin.search')} 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-surface-container-low p-1 rounded-xl">
              {(['all', 'completed', 'pending'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                    filter === f ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  {t(`admin.${f}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_12px_32px_rgba(0,76,82,0.04)] border border-outline-variant/10">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.name')}</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.role')}</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.status')}</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.team')}</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredApplicants.map((u) => {
                const team = teams.find(t => t.id === u.assignedTeamId);
                return (
                  <tr key={u.uid} className="hover:bg-surface-container/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedUser(u)}>
                        <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border border-outline-variant/20 flex items-center justify-center group-hover:border-primary transition-colors">
                          {u.photoURL ? (
                            <img 
                              className="w-full h-full object-cover" 
                              src={u.photoURL} 
                              alt={u.name}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-on-surface-variant/40">person</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-primary group-hover:underline">{u.name}</p>
                          <p className="text-xs text-on-surface-variant">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "font-bold text-[10px] uppercase tracking-tighter px-2 py-0.5 rounded",
                        u.role === 'admin' ? "bg-primary-container/20 text-primary-container" : "bg-surface-container-high text-on-surface-variant"
                      )}>
                        {u.role === 'admin' ? t('admin.leadArchitect') : t('admin.contributor')}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        u.completedTest ? "text-emerald-600" : "text-amber-600"
                      )}>
                        <span className={cn("w-2 h-2 rounded-full", u.completedTest ? "bg-emerald-600" : "bg-amber-600")}></span>
                        {u.completedTest ? t('admin.completed') : t('admin.pending')}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <select
                        value={u.assignedTeamId || ''}
                        onChange={(e) => handleReassign(u.uid, e.target.value || null)}
                        className="text-xs font-bold text-primary bg-transparent border-none focus:ring-0 cursor-pointer hover:underline p-0"
                      >
                        <option value="">{t('admin.noTeam')}</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {deletingId === u.uid ? (
                          <button onClick={() => handleDeleteUser(u.uid)} className="text-error hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                          </button>
                        ) : (
                          <button onClick={() => setDeletingId(u.uid)} disabled={u.uid === user?.uid} className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-0">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredApplicants.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline-variant/30 mb-4">person_search</span>
              <p className="text-on-surface-variant font-medium">{t('admin.noUsersFound')}</p>
            </div>
          )}
        </div>
      </section>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="relative h-32 bg-primary">
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="px-8 pb-8">
              <div className="relative -mt-16 mb-6">
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-surface-container-lowest shadow-xl bg-surface-container">
                  <img 
                    src={selectedUser.photoURL || "https://picsum.photos/seed/user/200/200"} 
                    alt={selectedUser.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black text-primary tracking-tighter">{selectedUser.name}</h3>
                  <p className="text-on-surface-variant font-medium">{selectedUser.email}</p>
                </div>
                <div className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest">
                  {selectedUser.role}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">
                    {t('register.phone')}
                  </p>
                  <p className="font-bold text-primary flex items-center gap-2">
                    <Phone size={14} />
                    {selectedUser.phone || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">
                    {t('register.department')}
                  </p>
                  <p className="font-bold text-primary flex items-center gap-2">
                    <Building size={14} />
                    {selectedUser.department || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">
                    {language === 'ar' ? 'الدولة' : 'Country'}
                  </p>
                  <p className="font-bold text-primary flex items-center gap-2">
                    <Globe size={14} />
                    {selectedUser.country || 'N/A'}
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">
                    {language === 'ar' ? 'نبذة شخصية' : 'Bio'}
                  </p>
                  <p className="text-on-surface-variant leading-relaxed bg-surface-container-low p-4 rounded-2xl italic">
                    {selectedUser.bio || (language === 'ar' ? 'لا توجد نبذة شخصية متاحة.' : 'No bio available.')}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-outline-variant/10 flex justify-end">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
