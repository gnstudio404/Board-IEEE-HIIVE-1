import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { User, Mail, Phone, Building, Camera, Save, Loader2, Globe, Award, Code, Briefcase, Plus, X, ExternalLink, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Profile() {
  const { profile, user } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ attendanceRate: 0, totalSessions: 0 });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    bio: '',
    country: '',
    photoURL: '',
    title: '',
    skills: [] as string[],
    badges: [] as string[],
    projects: [] as { name: string; description: string; link: string }[]
  });

  const [newSkill, setNewSkill] = useState('');
  const [newProject, setNewProject] = useState({ name: '', description: '', link: '' });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        department: profile.department || '',
        bio: profile.bio || '',
        country: profile.country || '',
        photoURL: profile.photoURL || '',
        title: profile.title || '',
        skills: profile.skills || [],
        badges: profile.badges || [],
        projects: profile.projects || []
      });
      fetchAttendanceStats();
    }
  }, [profile]);

  const fetchAttendanceStats = async () => {
    if (!profile?.email) return;
    try {
      const q = query(collection(db, 'attendance'), where('studentEmail', '==', profile.email));
      const snap = await getDocs(q);
      const total = snap.size;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      toast.success(language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      toast.error(language === 'ar' ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addProject = () => {
    if (newProject.name.trim() && newProject.description.trim()) {
      setFormData({ ...formData, projects: [...formData.projects, newProject] });
      setNewProject({ name: '', description: '', link: '' });
    }
  };

  const removeProject = (index: number) => {
    setFormData({ ...formData, projects: formData.projects.filter((_, i) => i !== index) });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary tracking-tighter">
            {language === 'ar' ? 'الملف الشخصي الذكي' : 'Smart Profile'}
          </h1>
          <p className="text-on-surface-variant mt-1">
            {language === 'ar' ? 'هويتك المهنية داخل IEEE HIIVE' : 'Your professional identity within IEEE HIIVE'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Summary & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <div className="relative inline-block group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/10 shadow-xl mx-auto">
                <img 
                  src={formData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || '')}&background=random`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-primary mt-6 tracking-tight">{profile?.name}</h2>
            <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest mt-1">{formData.title || profile?.role}</p>
            
            {/* Stats Grid */}
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

            {/* Badges */}
            {formData.badges.length > 0 && (
              <div className="mt-8 pt-8 border-t border-outline-variant/10">
                <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                  <Award size={14} className="text-primary" />
                  {language === 'ar' ? 'الأوسمة الشرفية' : 'Honorary Badges'}
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {formData.badges.map((badge, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full border border-amber-200 uppercase">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Mail size={16} className="text-primary" />
              <span className="truncate font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Building size={16} className="text-primary" />
              <span className="font-medium">{profile?.department || (language === 'ar' ? 'لم يحدد' : 'Not specified')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Globe size={16} className="text-primary" />
              <span className="font-medium">{profile?.country || (language === 'ar' ? 'لم تحدد الدولة' : 'Country not specified')}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Skills, Projects, Bio */}
        <div className="lg:col-span-8 space-y-8">
          {/* Bio Section */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
            <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
              <User size={20} />
              {language === 'ar' ? 'النبذة الشخصية' : 'About Me'}
            </h3>
            <textarea 
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder={language === 'ar' ? 'أخبرنا عن شغفك وأهدافك...' : 'Tell us about your passion and goals...'}
              className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all resize-none text-on-surface"
            />
          </div>

          {/* Skills Section */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
            <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
              <Code size={20} />
              {language === 'ar' ? 'المهارات التقنية' : 'Technical Skills'}
            </h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {formData.skills.map((skill, i) => (
                <span key={i} className="group flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl border border-primary/5">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="hover:text-error transition-colors">
                    <X size={14} />
                  </button>
                </span>
              ))}
              {formData.skills.length === 0 && (
                <p className="text-sm text-on-surface-variant italic">{language === 'ar' ? 'لا توجد مهارات مضافة بعد' : 'No skills added yet'}</p>
              )}
            </div>
            <div className="flex gap-2">
              <input 
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder={language === 'ar' ? 'أضف مهارة (مثال: UI/UX)' : 'Add a skill (e.g. UI/UX)'}
                className="flex-grow px-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all"
              />
              <button 
                onClick={addSkill}
                className="p-3 bg-primary text-white rounded-2xl hover:opacity-90 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>

          {/* Projects Section */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
            <h3 className="text-lg font-black text-primary mb-6 flex items-center gap-2">
              <Briefcase size={20} />
              {language === 'ar' ? 'المساهمات والمشاريع' : 'Projects & Contributions'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {formData.projects.map((project, i) => (
                <div key={i} className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/5 relative group">
                  <button 
                    onClick={() => removeProject(i)}
                    className="absolute top-3 right-3 p-1 bg-error/10 text-error rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                  <h4 className="font-black text-primary mb-1">{project.name}</h4>
                  <p className="text-xs text-on-surface-variant line-clamp-2 mb-3">{project.description}</p>
                  {project.link && (
                    <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-secondary flex items-center gap-1 hover:underline">
                      <ExternalLink size={10} />
                      {language === 'ar' ? 'عرض المشروع' : 'View Project'}
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-surface-container-low/50 p-6 rounded-3xl border border-dashed border-outline-variant/30 space-y-4">
              <h4 className="text-sm font-black text-on-surface-variant mb-2">{language === 'ar' ? 'إضافة مشروع جديد' : 'Add New Project'}</h4>
              <input 
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder={language === 'ar' ? 'اسم المشروع' : 'Project Name'}
                className="w-full px-4 py-3 bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
              />
              <textarea 
                rows={2}
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder={language === 'ar' ? 'وصف مختصر لمساهمتك...' : 'Brief description of your contribution...'}
                className="w-full px-4 py-3 bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-primary transition-all resize-none"
              />
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newProject.link}
                  onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                  placeholder={language === 'ar' ? 'رابط المشروع (اختياري)' : 'Project Link (Optional)'}
                  className="flex-grow px-4 py-3 bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                />
                <button 
                  onClick={addProject}
                  className="px-6 bg-secondary text-white rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-primary text-white px-12 py-5 rounded-3xl font-black text-lg flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-primary/30 disabled:opacity-50 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
              {language === 'ar' ? 'حفظ الملف الشخصي الذكي' : 'Save Smart Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
