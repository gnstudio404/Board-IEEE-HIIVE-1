import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { User, Mail, Phone, Building, Camera, Save, Loader2, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Profile() {
  const { profile, user } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    bio: '',
    country: '',
    photoURL: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        department: profile.department || '',
        bio: profile.bio || '',
        country: profile.country || '',
        photoURL: profile.photoURL || ''
      });
    }
  }, [profile]);

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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary tracking-tighter">
            {language === 'ar' ? 'الملف الشخصي' : 'User Profile'}
          </h1>
          <p className="text-on-surface-variant mt-1">
            {language === 'ar' ? 'إدارة بياناتك الشخصية والمهنية' : 'Manage your personal and professional information'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm text-center">
            <div className="relative inline-block group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/10 shadow-xl mx-auto">
                <img 
                  src={formData.photoURL || "https://picsum.photos/seed/user/200/200"} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                <Camera size={18} />
                <input 
                  type="text" 
                  className="hidden" 
                  placeholder="URL"
                  onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
                />
              </label>
            </div>
            
            <h2 className="text-2xl font-black text-primary mt-6 tracking-tight">{profile?.name}</h2>
            <p className="text-on-surface-variant text-sm font-medium uppercase tracking-widest mt-1">{profile?.role}</p>
            
            <div className="mt-8 pt-8 border-t border-outline-variant/10 space-y-4">
              <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                <Mail size={16} className="text-primary" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                <Building size={16} className="text-primary" />
                <span>{profile?.department || (language === 'ar' ? 'لم يحدد' : 'Not specified')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                <Globe size={16} className="text-primary" />
                <span>{profile?.country || (language === 'ar' ? 'لم تحدد الدولة' : 'Country not specified')}</span>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
            <h3 className="text-primary font-black text-xs uppercase tracking-widest mb-3">
              {language === 'ar' ? 'رابط الصورة' : 'Photo URL'}
            </h3>
            <input 
              type="text"
              required
              value={formData.photoURL}
              onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
              placeholder="https://example.com/photo.jpg"
              className="w-full bg-surface-container-lowest border-none rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-on-surface-variant/60 mt-2">
              {language === 'ar' ? 'الصق رابط صورة مباشرة لتحديث صورتك الشخصية' : 'Paste a direct image link to update your profile picture'}
            </p>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-primary uppercase tracking-widest ml-1">
                  {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-primary uppercase tracking-widest ml-1">
                  {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                  <input 
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-primary uppercase tracking-widest ml-1">
                  {language === 'ar' ? 'الدولة' : 'Country'}
                </label>
                <div className="relative">
                  <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                  <input 
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder={language === 'ar' ? 'مثال: مصر' : 'e.g. Egypt'}
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-primary uppercase tracking-widest ml-1">
                  {language === 'ar' ? 'القسم / التخصص' : 'Department / Specialization'}
                </label>
                <div className="relative">
                  <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                  <input 
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-primary uppercase tracking-widest ml-1">
                  {language === 'ar' ? 'نبذة شخصية' : 'Personal Bio'}
                </label>
                <textarea 
                  rows={4}
                  required
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder={language === 'ar' ? 'أخبرنا المزيد عن خبراتك ومهاراتك...' : 'Tell us more about your experience and skills...'}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/10 flex justify-end">
              <button 
                type="submit"
                disabled={loading}
                className="bg-primary text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
