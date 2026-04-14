import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Users, ArrowRight, ClipboardList, Trophy, Star, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Team, UserScore } from '../types';
import { cn } from '../lib/utils';

export default function ApplicantHome() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [score, setScore] = useState<UserScore | null>(null);

  useEffect(() => {
    // Redirect to profile if any required field is missing (first time setup)
    const isProfileComplete = profile && 
      profile.name && 
      profile.phone && 
      profile.department && 
      profile.bio && 
      profile.country && 
      profile.photoURL;

    if (profile && !isProfileComplete) {
      navigate('/profile');
      return;
    }

    if (profile?.assignedTeamId) {
      const fetchTeam = async () => {
        try {
          const teamDoc = await getDoc(doc(db, 'teams', profile.assignedTeamId!));
          if (teamDoc.exists()) {
            setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `teams/${profile.assignedTeamId}`);
        }
      };
      fetchTeam();
    }

    if (profile?.completedTest) {
      const fetchScore = async () => {
        try {
          const scoreDoc = await getDoc(doc(db, 'scores', profile.uid));
          if (scoreDoc.exists()) {
            setScore(scoreDoc.data() as UserScore);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `scores/${profile.uid}`);
        }
      };
      fetchScore();
    }
  }, [profile?.assignedTeamId, profile?.completedTest, profile?.uid]);

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-secondary font-bold tracking-widest text-xs uppercase mb-2 block">
            {language === 'ar' ? 'لوحة تحكم المهندس' : 'Engineer Dashboard'}
          </span>
          <h2 className="text-4xl font-bold text-primary tracking-tight mb-2">
            {language === 'ar' ? `مرحباً، ${profile?.name}` : `Welcome, ${profile?.name}`}
          </h2>
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-block w-2 h-2 rounded-full animate-pulse",
              profile?.completedTest ? "bg-primary" : "bg-secondary-container"
            )}></span>
            <p className="text-on-surface-variant font-medium">
              {language === 'ar' ? 'الحالة:' : 'Status:'} <span className="text-primary">
                {profile?.completedTest 
                  ? (language === 'ar' ? 'تم الاختبار' : 'Test Completed') 
                  : (language === 'ar' ? 'بانتظار الاختبار' : 'Test Pending')}
              </span>
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-4">
          <div className="px-4 py-2 rounded-full bg-surface-container-low flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">calendar_today</span>
            <span className="text-xs font-bold text-on-surface-variant uppercase">
              {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </section>

      {/* Main Progress Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Registration (Completed) */}
        <div className="bg-surface-container-lowest rounded-xl p-8 hive-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
            <span className="material-symbols-outlined text-primary text-3xl opacity-20">assignment_turned_in</span>
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary fill-1">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">
              {language === 'ar' ? 'التسجيل' : 'Registration'}
            </h3>
            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
              {language === 'ar' ? 'التحقق من الملف الشخصي ورفع المستندات.' : 'Profile verification and documents upload.'}
            </p>
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span>{language === 'ar' ? 'مكتمل' : 'Completed'}</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-primary"></div>
        </div>

        {/* Step 2: MCQ Test (Active/Completed) */}
        <div className={cn(
          "bg-surface-container-lowest rounded-xl p-8 hive-shadow relative overflow-hidden",
          !profile?.completedTest && "ring-1 ring-primary/5"
        )}>
          <div className="absolute top-0 right-0 p-4">
            <span className="material-symbols-outlined text-secondary text-3xl opacity-20">quiz</span>
          </div>
          <div className="relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center mb-6",
              profile?.completedTest ? "bg-primary/10" : "bg-secondary/10"
            )}>
              <span className={cn(
                "material-symbols-outlined",
                profile?.completedTest ? "text-primary fill-1" : "text-secondary"
              )}>
                {profile?.completedTest ? "check_circle" : "timer"}
              </span>
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">
              {language === 'ar' ? 'اختبار MCQ' : 'MCQ Test'}
            </h3>
            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
              {language === 'ar' ? 'التقييم الفني للكفاءة الهندسية.' : 'Technical assessment for engineering proficiency.'}
            </p>
            {profile?.completedTest ? (
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span>{language === 'ar' ? 'مكتمل' : 'Completed'}</span>
              </div>
            ) : (
              <Link 
                to="/test" 
                className="w-full bg-secondary text-white font-bold py-3 px-6 rounded-lg active:scale-[0.98] transition-all hover:brightness-110 flex items-center justify-center gap-2"
              >
                {language === 'ar' ? 'ابدأ الاختبار' : 'Start Test'}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            )}
          </div>
          <div className={cn(
            "absolute bottom-0 left-0 w-full h-1",
            profile?.completedTest ? "bg-primary" : "bg-secondary-container"
          )}></div>
        </div>

        {/* Step 3: Team Assignment (Waiting/Completed) */}
        <div className={cn(
          "rounded-xl p-8 relative overflow-hidden transition-all",
          profile?.assignedTeamId 
            ? "bg-surface-container-lowest hive-shadow" 
            : "bg-surface-container-low opacity-80"
        )}>
          <div className="absolute top-0 right-0 p-4">
            <span className="material-symbols-outlined text-outline text-3xl opacity-20">groups</span>
          </div>
          <div className="relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center mb-6",
              profile?.assignedTeamId ? "bg-primary/10" : "bg-surface-container-high"
            )}>
              <span className={cn(
                "material-symbols-outlined",
                profile?.assignedTeamId ? "text-primary fill-1" : "text-outline"
              )}>
                {profile?.assignedTeamId ? "check_circle" : "hourglass_empty"}
              </span>
            </div>
            <h3 className={cn(
              "text-xl font-bold mb-2",
              profile?.assignedTeamId ? "text-primary" : "text-on-surface-variant"
            )}>
              {language === 'ar' ? 'تعيين الفريق' : 'Team Assignment'}
            </h3>
            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
              {language === 'ar' ? 'التنسيب داخل خلية هندسية مناسبة.' : 'Placement within appropriate engineering hive.'}
            </p>
            {profile?.assignedTeamId ? (
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span>{language === 'ar' ? 'مكتمل' : 'Completed'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-outline font-bold text-sm italic">
                <span>{language === 'ar' ? 'بانتظار إكمال الاختبار' : 'Waiting for Test Completion'}</span>
              </div>
            )}
          </div>
          {profile?.assignedTeamId && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary"></div>}
        </div>
      </div>

      {/* Secondary Layout: Human Impact & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Impact Section */}
        <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl p-10 hive-shadow overflow-hidden relative">
          <div className="relative z-10 max-w-md">
            <span className="text-primary font-bold tracking-widest text-xs uppercase mb-4 block">
              {language === 'ar' ? 'التركيز على الاستدامة' : 'Sustainability Focus'}
            </span>
            <h3 className="text-3xl font-extrabold text-primary tracking-tight mb-4">
              {language === 'ar' ? 'التأثير البشري' : 'Human Impact'}
            </h3>
            <p className="text-on-surface-variant leading-relaxed mb-8">
              {language === 'ar' 
                ? 'تكرس خليتنا الهندسية جهودها لحلول الطاقة النظيفة. نصمم أنظمة تمكن المجتمعات من خلال التكنولوجيا المستدامة والتكامل المعماري الدقيق.'
                : 'Our engineering hive is dedicated to clean energy solutions. We design systems that empower communities through sustainable technology and precise architectural integration.'}
            </p>
            <div className="flex gap-8">
              <div>
                <div className="text-2xl font-bold text-primary">12.4 GW</div>
                <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  {language === 'ar' ? 'طاقة نظيفة مولدة' : 'Clean Energy Generated'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">850k</div>
                <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  {language === 'ar' ? 'حياة تأثرت' : 'Lives Impacted'}
                </div>
              </div>
            </div>
          </div>
          {/* Artistic Imagery */}
          <div className="absolute right-0 top-0 h-full w-1/3 hidden md:block">
            <div className="w-full h-full bg-primary/5 clip-path-polygon">
              <img 
                className="w-full h-full object-cover mix-blend-overlay opacity-60" 
                src="https://picsum.photos/seed/energy/800/800"
                alt="Energy"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Side Card: Resources */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-primary-gradient rounded-xl p-8 text-white relative overflow-hidden">
            <h4 className="text-xl font-bold mb-4">
              {language === 'ar' ? 'إرشادات المهندس' : 'Engineer Guidelines'}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-fixed text-sm">verified_user</span>
                <span className="text-sm font-medium opacity-90">Architecture Standards v4.2</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-fixed text-sm">verified_user</span>
                <span className="text-sm font-medium opacity-90">Safety Protocols & Ethics</span>
              </li>
            </ul>
            <div className="mt-8">
              <a className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 group" href="#">
                {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                <span className="material-symbols-outlined text-xs group-hover:translate-x-1 transition-transform">download</span>
              </a>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-8">
            <h4 className="text-primary font-bold mb-4">
              {language === 'ar' ? 'آخر التحديثات' : 'Latest Updates'}
            </h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-secondary-container mt-1.5 flex-shrink-0"></div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {language === 'ar' ? 'بدء مشروع رياح بحري جديد في مجموعة بحر الشمال.' : 'New offshore wind project initiated in the North Sea cluster.'}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {language === 'ar' ? 'ندوة فنية قادمة حول موازنة الأحمال المدعومة بالذكاء الاصطناعي.' : 'Upcoming technical seminar on AI-driven load balancing.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
