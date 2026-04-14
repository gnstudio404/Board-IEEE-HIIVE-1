import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserScore, Team } from '../types';
import { Users, CheckCircle2, Clock, Trophy, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalApplicants: 0,
    completedTests: 0,
    pendingUsers: 0,
    totalTeams: 0
  });
  const [traitDistribution, setTraitDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let usersSnap;
        try {
          usersSnap = await getDocs(collection(db, 'users'));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'users');
          return;
        }
        const users = usersSnap.docs.map(doc => doc.data() as UserProfile);
        const applicants = users.filter(u => u.role === 'applicant');
        
        let teamsSnap;
        try {
          teamsSnap = await getDocs(collection(db, 'teams'));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'teams');
          return;
        }

        let scoresSnap;
        try {
          scoresSnap = await getDocs(collection(db, 'scores'));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'scores');
          return;
        }

        const scores = scoresSnap.docs.map(doc => doc.data() as UserScore);
        const distribution: Record<string, number> = {
          leadership: 0,
          organization: 0,
          communication: 0,
          creativity: 0,
          analysis: 0,
          execution: 0
        };

        scores.forEach(score => {
          if (score.primaryTrait && distribution[score.primaryTrait] !== undefined) {
            distribution[score.primaryTrait]++;
          }
        });

        const chartData = Object.entries(distribution).map(([name, value]) => ({
          name,
          value
        }));

        setTraitDistribution(chartData);
        
        setStats({
          totalApplicants: applicants.length,
          completedTests: applicants.filter(u => u.completedTest).length,
          pendingUsers: applicants.filter(u => !u.completedTest).length,
          totalTeams: teamsSnap.size
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-12">
      {/* Section: Dashboard Overview (Bento Grid) */}
      <section id="dashboard">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-primary font-bold tracking-tight text-sm mb-1 uppercase">{t('admin.analytics')}</p>
            <h2 className="text-4xl font-extrabold text-primary tracking-tighter">{t('admin.systemPerformance')}</h2>
          </div>
          <button className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-sm">download</span>
            {t('admin.export')}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Large Card: Active Users Flow */}
          <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-[0px_12px_32px_rgba(0,76,82,0.04)] relative overflow-hidden group border border-outline-variant/10">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <span className="material-symbols-outlined text-8xl text-primary">trending_up</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-on-surface-variant font-bold text-xs uppercase tracking-widest mb-6">{t('admin.engagement')}</h3>
              <div className="flex items-baseline gap-4 mb-10">
                <span className="text-5xl font-black text-primary tracking-tighter">
                  {stats.totalApplicants > 1000 ? `${(stats.totalApplicants / 1000).toFixed(1)}k` : stats.totalApplicants}
                </span>
                <span className="text-secondary font-bold text-sm bg-secondary-fixed px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">arrow_upward</span>
                  12.4%
                </span>
              </div>
              
              {/* Animated Chart Bars */}
              <div className="h-48 w-full flex items-end gap-3 mt-4">
                {[40, 65, 50, 85, 45, 70, 90, 60, 75, 55].map((height, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-500",
                      i === 5 ? "bg-secondary" : "bg-primary/10 group-hover:bg-primary/30 dark:bg-primary/20 dark:group-hover:bg-primary/40"
                    )}
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Vertical Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(0,76,82,0.04)] border border-outline-variant/10">
              <span className="material-symbols-outlined text-secondary mb-4">bolt</span>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{t('admin.evalSpeed')}</p>
              <p className="text-3xl font-black text-primary mt-1">1.2s</p>
              <p className="text-xs text-on-surface-variant/60 mt-2">{t('admin.latency')}</p>
            </div>
            
            <div className="bg-primary text-on-primary rounded-xl p-6 shadow-[0px_12px_32px_rgba(0,76,82,0.1)] dark:bg-surface-container-lowest dark:text-on-surface dark:border dark:border-outline-variant/10">
              <span className="material-symbols-outlined text-on-primary dark:text-primary mb-4">workspace_premium</span>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">{t('admin.precision')}</p>
              <p className="text-3xl font-black mt-1">99.4%</p>
              <div className="w-full bg-on-primary/20 dark:bg-surface-container-high h-1.5 rounded-full mt-4">
                <div className="bg-on-primary dark:bg-primary w-[99.4%] h-full rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trait Distribution Chart Section */}
      <section className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/10 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <BarChart3 className="text-primary w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-primary tracking-tight">{t('admin.traitDist')}</h3>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={traitDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-outline-variant/20" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-on-surface-variant"
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-on-surface-variant"
              />
              <Tooltip 
                cursor={{ fill: 'currentColor', className: 'text-surface-container-high/20' }}
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface-container-lowest)', 
                  border: '1px solid var(--color-outline-variant)', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: 'var(--color-on-surface)', fontWeight: 'bold' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                {traitDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="var(--color-primary)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('admin.totalApplicants')} 
          value={stats.totalApplicants} 
          icon="group" 
          color="text-primary bg-primary/10 dark:bg-primary/20" 
        />
        <StatCard 
          title={t('admin.completedTests')} 
          value={stats.completedTests} 
          icon="check_circle" 
          color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" 
        />
        <StatCard 
          title={t('admin.pendingUsers')} 
          value={stats.pendingUsers} 
          icon="timer" 
          color="text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" 
        />
        <StatCard 
          title={t('admin.totalTeams')} 
          value={stats.totalTeams} 
          icon="diversity_3" 
          color="text-secondary bg-secondary/10 dark:bg-secondary/20" 
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", color)}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <h3 className="text-on-surface-variant text-sm font-bold uppercase tracking-wider">{title}</h3>
      <p className="text-3xl font-black text-primary mt-1">{value}</p>
    </div>
  );
}

function HealthItem({ label, status, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className={cn("text-sm font-bold", color)}>{status}</span>
    </div>
  );
}

function ActivityItem({ text, time }: any) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600 dark:text-slate-400 truncate mr-2">{text}</span>
      <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap">{time}</span>
    </div>
  );
}
