import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  User, Mail, Building, Globe, Award, Code, Briefcase, 
  ExternalLink, BarChart3, ArrowLeft, Loader2, Calendar
} from 'lucide-react';

export default function MemberProfile() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ attendanceRate: 0, totalSessions: 0 });

  useEffect(() => {
    if (uid) {
      fetchProfile();
    }
  }, [uid]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'users', uid!));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        await fetchAttendanceStats(data.email);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async (email: string) => {
    try {
      const q = query(collection(db, 'attendance'), where('studentEmail', '==', email));
      const snap = await getDocs(q);
      const present = snap.docs.filter(d => d.data().status === 'present').length;
      
      const sessionsSnap = await getDocs(collection(db, 'sessions'));
      const totalPossible = sessionsSnap.size;

      setStats({
        attendanceRate: totalPossible > 0 ? (present / totalPossible) * 100 : 0,
        totalSessions: present
      });
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-on-surface-variant animate-pulse font-bold">
          {language === 'ar' ? 'جاري تحميل الملف الذكي...' : 'Loading Smart Profile...'}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-error mb-4">
          {language === 'ar' ? 'لم يتم العثور على الملف' : 'Profile Not Found'}
        </h2>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline font-bold">
          {language === 'ar' ? 'العودة للخلف' : 'Go Back'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        {language === 'ar' ? 'العودة للقائمة' : 'Back to List'}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Summary & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/10 shadow-xl mx-auto">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random`} 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <h2 className="text-2xl font-black text-primary mt-6 tracking-tight">{profile.name}</h2>
            <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest mt-1">{profile.title || profile.role}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-[10px] uppercase font-black text-primary/60 mb-1">{language === 'ar' ? 'نسبة الحضور' : 'Attendance'}</p>
                <p className="text-xl font-black text-primary">{stats.attendanceRate.toFixed(0)}%</p>
              </div>
              <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                <p className="text-[10px] uppercase font-black text-secondary/60 mb-1">{language === 'ar' ? 'الجلسات' : 'Sessions'}</p>
                <p className="text-xl font-black text-secondary">{stats.totalSessions}</p>
              </div>
            </div>

            {profile.badges && profile.badges.length > 0 && (
              <div className="mt-8 pt-8 border-t border-outline-variant/10">
                <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                  <Award size={14} className="text-primary" />
                  {language === 'ar' ? 'الأوسمة الشرفية' : 'Honorary Badges'}
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {profile.badges.map((badge, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full border border-amber-200 uppercase">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Mail size={16} className="text-primary" />
              <span className="truncate font-medium">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Building size={16} className="text-primary" />
              <span className="font-medium">{profile.department || (language === 'ar' ? 'لم يحدد' : 'Not specified')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Globe size={16} className="text-primary" />
              <span className="font-medium">{profile.country || (language === 'ar' ? 'لم تحدد الدولة' : 'Country not specified')}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Skills, Projects, Bio */}
        <div className="lg:col-span-8 space-y-8">
          {profile.bio && (
            <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
              <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
                <User size={20} />
                {language === 'ar' ? 'النبذة الشخصية' : 'About Me'}
              </h3>
              <p className="text-on-surface leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
            <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
              <Code size={20} />
              {language === 'ar' ? 'المهارات التقنية' : 'Technical Skills'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill, i) => (
                  <span key={i} className="px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl border border-primary/5">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant italic">{language === 'ar' ? 'لا توجد مهارات مضافة' : 'No skills added'}</p>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
            <h3 className="text-lg font-black text-primary mb-6 flex items-center gap-2">
              <Briefcase size={20} />
              {language === 'ar' ? 'المساهمات والمشاريع' : 'Projects & Contributions'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.projects && profile.projects.length > 0 ? (
                profile.projects.map((project, i) => (
                  <div key={i} className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <h4 className="font-black text-primary mb-1">{project.name}</h4>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-3">{project.description}</p>
                    {project.link && (
                      <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-secondary flex items-center gap-1 hover:underline">
                        <ExternalLink size={10} />
                        {language === 'ar' ? 'عرض المشروع' : 'View Project'}
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant italic col-span-2">{language === 'ar' ? 'لا توجد مشاريع مضافة' : 'No projects added'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
