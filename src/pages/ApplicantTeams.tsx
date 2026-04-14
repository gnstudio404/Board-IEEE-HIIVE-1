import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Team } from '../types';
import { Users, Shield, Zap, Target, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ApplicantTeams() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!profile?.assignedTeamId) {
        setLoading(false);
        return;
      }

      try {
        const teamDoc = await getDoc(doc(db, 'teams', profile.assignedTeamId));
        if (teamDoc.exists()) {
          setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `teams/${profile.assignedTeamId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [profile?.assignedTeamId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-medium animate-pulse">
          {language === 'ar' ? 'جاري تحميل بيانات الفريق...' : 'Loading team data...'}
        </p>
      </div>
    );
  }

  if (!profile?.assignedTeamId || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="w-24 h-24 bg-surface-container-low rounded-3xl flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 bg-primary/5 rounded-3xl animate-ping"></div>
          <span className="material-symbols-outlined text-5xl text-primary relative z-10">groups_3</span>
        </div>
        <h2 className="text-3xl font-black text-primary tracking-tighter mb-4">
          {language === 'ar' ? 'لم يتم تحديد فريق بعد' : 'No Team Assigned Yet'}
        </h2>
        <p className="text-on-surface-variant max-w-md leading-relaxed mb-8">
          {language === 'ar' 
            ? 'أنت حالياً في مرحلة التقييم. سيقوم النظام بتوزيعك على الفريق الأنسب بناءً على نتائج اختبارك ومهاراتك الهندسية فور اكتمال عملية المراجعة.'
            : 'You are currently in the assessment phase. The system will assign you to the most suitable team based on your test results and engineering skills once the review process is complete.'}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">info</span>
            {language === 'ar' ? 'قيد المراجعة' : 'Under Review'}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            {language === 'ar' ? 'توزيع تلقائي' : 'Auto Assignment'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Team Header */}
      <section className="relative overflow-hidden rounded-3xl bg-primary p-10 text-white shadow-2xl shadow-primary/20">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <span className="material-symbols-outlined text-[180px]">diversity_3</span>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
              {language === 'ar' ? 'فريقك الحالي' : 'Your Current Team'}
            </div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-4">{team.name}</h1>
          <p className="text-white/80 max-w-xl leading-relaxed text-lg">
            {language === 'ar'
              ? 'أنت الآن جزء من خلية هندسية متكاملة. تعاون مع زملائك لتحقيق أهداف الاستدامة والابتكار التقني.'
              : 'You are now part of an integrated engineering hive. Collaborate with your teammates to achieve sustainability and technical innovation goals.'}
          </p>
        </div>
      </section>

      {/* Team Stats & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
            <Users size={24} />
          </div>
          <h3 className="text-on-surface-variant text-xs font-black uppercase tracking-widest mb-2">
            {language === 'ar' ? 'أعضاء الفريق' : 'Team Members'}
          </h3>
          <p className="text-4xl font-black text-primary tracking-tighter">{team.memberCount}</p>
          <div className="mt-4 h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${(team.memberCount / team.maxSize) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-6 text-secondary">
            <Target size={24} />
          </div>
          <h3 className="text-on-surface-variant text-xs font-black uppercase tracking-widest mb-2">
            {language === 'ar' ? 'السعة القصوى' : 'Max Capacity'}
          </h3>
          <p className="text-4xl font-black text-primary tracking-tighter">{team.maxSize}</p>
          <p className="text-xs text-on-surface-variant/60 mt-2">
            {language === 'ar' ? 'الحد الأدنى المطلوب:' : 'Minimum required:'} {team.minSize}
          </p>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
            <Shield size={24} />
          </div>
          <h3 className="text-on-surface-variant text-xs font-black uppercase tracking-widest mb-2">
            {language === 'ar' ? 'حالة الفريق' : 'Team Status'}
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <p className="text-2xl font-black text-primary tracking-tighter">
              {language === 'ar' ? 'نشط' : 'Active'}
            </p>
          </div>
          <p className="text-xs text-on-surface-variant/60 mt-2">
            {language === 'ar' ? 'جاهز للمهام الجديدة' : 'Ready for new tasks'}
          </p>
        </div>
      </div>

      {/* Team Mission Card */}
      <div className="bg-surface-container-low rounded-3xl p-10 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest mb-4">
            <Zap size={14} fill="currentColor" />
            {language === 'ar' ? 'مهمة الخلية' : 'Hive Mission'}
          </div>
          <h2 className="text-3xl font-black text-primary tracking-tighter mb-6">
            {language === 'ar' ? 'الابتكار من أجل الاستدامة' : 'Innovation for Sustainability'}
          </h2>
          <p className="text-on-surface-variant leading-relaxed mb-8">
            {language === 'ar'
              ? 'يعمل فريقك حالياً على تطوير حلول تقنية تهدف إلى تقليل الانبعاثات الكربونية وتحسين كفاءة استهلاك الطاقة في المشاريع العمرانية الكبرى.'
              : 'Your team is currently developing technical solutions aimed at reducing carbon emissions and improving energy efficiency in major urban projects.'}
          </p>
          <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            {language === 'ar' ? 'عرض تفاصيل المشروع' : 'View Project Details'}
          </button>
        </div>
        <div className="w-full md:w-1/3 aspect-square rounded-2xl overflow-hidden shadow-2xl">
          <img 
            src={`https://picsum.photos/seed/${team.id}/600/600`} 
            alt="Team Mission" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}
