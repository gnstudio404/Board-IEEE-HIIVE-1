import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Team, UserProfile, UserScore } from '../types';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Users, Wand2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function AdminTeams() {
  const { t } = useLanguage();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'primary';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'primary'
  });

  const [formData, setFormData] = useState<Partial<Team>>({
    name: '',
    minSize: 4,
    maxSize: 6,
    memberCount: 0
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      let querySnapshot;
      try {
        querySnapshot = await getDocs(collection(db, 'teams'));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'teams');
        return;
      }
      setTeams(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Please enter a team name");
      return;
    }

    try {
      if (editingId) {
        try {
          await updateDoc(doc(db, 'teams', editingId), formData);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `teams/${editingId}`);
          return;
        }
        toast.success("Team updated");
      } else {
        try {
          await addDoc(collection(db, 'teams'), { ...formData, memberCount: 0 });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'teams');
          return;
        }
        toast.success("Team created");
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', minSize: 4, maxSize: 6, memberCount: 0 });
      fetchTeams();
    } catch (error) {
      toast.error("Failed to save team");
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      show: true,
      title: t('admin.deleteTeam'),
      message: 'Are you sure? This will not unassign users automatically.',
      type: 'danger',
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id: string) => {
    try {
      try {
        await deleteDoc(doc(db, 'teams', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `teams/${id}`);
        return;
      }
      toast.success("Team deleted");
      fetchTeams();
    } catch (error) {
      toast.error("Failed to delete team");
    }
  };

  const handleAutoAssign = async () => {
    if (teams.length === 0) {
      toast.error("Please create at least one team first.");
      return;
    }

    setAssigning(true);
    try {
      // 1. Fetch all applicants who completed the test and are NOT assigned
      let usersSnap;
      try {
        usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'applicant'), where('completedTest', '==', true)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return;
      }
      const unassignedUsers = usersSnap.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
        .filter(u => !u.assignedTeamId);

      if (unassignedUsers.length === 0) {
        toast.info("No unassigned applicants found.");
        setAssigning(false);
        return;
      }

      // 2. Fetch scores for these users
      let scoresSnap;
      try {
        scoresSnap = await getDocs(collection(db, 'scores'));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'scores');
        return;
      }
      const scoresMap: Record<string, UserScore> = {};
      scoresSnap.docs.forEach(doc => {
        scoresMap[doc.id] = doc.data() as UserScore;
      });

      // 3. Sort users by their primary trait to distribute them
      const usersWithScores = unassignedUsers.map(u => ({
        user: u,
        score: scoresMap[u.uid]
      })).filter(u => u.score);

      // Group by primary trait
      const groupedByTrait: Record<string, typeof usersWithScores> = {};
      usersWithScores.forEach(u => {
        const trait = u.score.primaryTrait;
        if (!groupedByTrait[trait]) groupedByTrait[trait] = [];
        groupedByTrait[trait].push(u);
      });

      // 4. Assignment Logic
      const batch = writeBatch(db);
      const currentTeams = [...teams];
      
      // Flatten users in a way that mixes traits
      const traits = Object.keys(groupedByTrait);
      const sortedUsers: typeof usersWithScores = [];
      let hasMore = true;
      let i = 0;
      while (hasMore) {
        hasMore = false;
        traits.forEach(t => {
          if (groupedByTrait[t][i]) {
            sortedUsers.push(groupedByTrait[t][i]);
            hasMore = true;
          }
        });
        i++;
      }

      // Distribute into teams
      sortedUsers.forEach(u => {
        // Find team with least members that is not full
        const availableTeams = currentTeams.filter(t => t.memberCount < t.maxSize);
        if (availableTeams.length === 0) return;

        // Sort by member count ascending
        availableTeams.sort((a, b) => a.memberCount - b.memberCount);
        const targetTeam = availableTeams[0];

        // Update user
        batch.update(doc(db, 'users', u.user.uid), {
          assignedTeamId: targetTeam.id
        });

        // Update team count locally
        targetTeam.memberCount++;
        
        // Create assignment record
        batch.set(doc(collection(db, 'assignments')), {
          userId: u.user.uid,
          teamId: targetTeam.id,
          assignedBy: 'system',
          timestamp: new Date().toISOString()
        });
      });

      // Update team counts in DB
      currentTeams.forEach(t => {
        batch.update(doc(db, 'teams', t.id), {
          memberCount: t.memberCount
        });
      });

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'batch-auto-assign');
        return;
      }
      toast.success(`Successfully assigned ${sortedUsers.length} users!`);
      fetchTeams();
    } catch (error) {
      console.error("Assignment error:", error);
      toast.error("Failed to run assignment engine");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-12">
      <section id="teams">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-primary font-bold tracking-tight text-sm mb-1 uppercase">{t('admin.structuralOrg')}</p>
            <h2 className="text-4xl font-extrabold text-primary tracking-tighter">{t('admin.teams')}</h2>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleAutoAssign}
              disabled={assigning}
              className="bg-surface-container-low text-primary px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-surface-container-high transition-all"
            >
              <span className={cn("material-symbols-outlined text-sm", assigning && "animate-spin")}>
                {assigning ? 'sync' : 'auto_fix'}
              </span>
              {t('admin.autoAssign')}
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              {t('admin.addTeam')}
            </button>
          </div>
        </div>

        {(isAdding || editingId) && (
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-primary/20 shadow-xl mb-12">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-primary tracking-tighter">{editingId ? t('admin.editTeam') : t('admin.addTeam')}</h3>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.teamName')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-surface-container-low border-none rounded-xl text-sm font-bold focus:ring-1 focus:ring-primary"
                  placeholder="Team Alpha..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.minSize')}</label>
                <input
                  type="number"
                  value={formData.minSize}
                  onChange={(e) => setFormData({ ...formData, minSize: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-surface-container-low border-none rounded-xl text-sm font-bold focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.maxSize')}</label>
                <input
                  type="number"
                  value={formData.maxSize}
                  onChange={(e) => setFormData({ ...formData, maxSize: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-surface-container-low border-none rounded-xl text-sm font-bold focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-10">
              <button
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-8 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-all"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={handleSave}
                className="bg-primary text-white px-10 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                {t('admin.save')}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all">
                <span className="material-symbols-outlined text-8xl text-primary">diversity_3</span>
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-2xl font-black text-primary tracking-tighter">{team.name}</h4>
                  <p className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-widest mt-1">{t('admin.id')}: {team.id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => { setEditingId(team.id); setFormData(team); }}
                    className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest">{t('admin.activeMembers')}</p>
                    <p className="text-4xl font-black text-primary tracking-tighter">{team.memberCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest">{t('admin.threshold')}</p>
                    <p className="text-sm font-black text-primary">{team.minSize} - {team.maxSize}</p>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      team.memberCount < team.minSize ? "bg-amber-500" : 
                      team.memberCount > team.maxSize ? "bg-error" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min((team.memberCount / team.maxSize) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  {team.memberCount < team.minSize ? (
                    <div className="flex items-center gap-2 text-amber-600 text-[10px] font-black uppercase tracking-widest">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      {t('admin.underCapacity')}
                    </div>
                  ) : team.memberCount >= team.maxSize ? (
                    <div className="flex items-center gap-2 text-error text-[10px] font-black uppercase tracking-widest">
                      <span className="material-symbols-outlined text-sm">block</span>
                      {t('admin.maxReached')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {t('admin.optimalBalance')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-8 rounded-3xl max-w-md w-full shadow-2xl border border-outline-variant/10 transform animate-in zoom-in-95 duration-200">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
              confirmModal.type === 'danger' ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
            )}>
              <span className="material-symbols-outlined text-3xl">
                {confirmModal.type === 'danger' ? 'warning' : 'help'}
              </span>
            </div>
            <h3 className="text-2xl font-black text-primary tracking-tighter mb-2">{confirmModal.title}</h3>
            <p className="text-on-surface-variant leading-relaxed mb-8">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="px-6 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-all"
              >
                {t('admin.cancel')}
              </button>
              <button 
                onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}
                className={cn(
                  "px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg",
                  confirmModal.type === 'danger' ? "bg-error shadow-error/20 hover:opacity-90" : "bg-primary shadow-primary/20 hover:opacity-90"
                )}
              >
                {confirmModal.type === 'danger' ? t('admin.delete') : t('admin.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
