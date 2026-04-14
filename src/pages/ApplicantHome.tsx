import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'motion/react';
import { ShieldAlert, LogIn } from 'lucide-react';

export default function ApplicantHome() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-container-lowest rounded-3xl p-12 shadow-xl border border-outline-variant/10 text-center"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="font-headline text-4xl font-bold text-primary mb-4">
          {t('home.welcome')}
        </h1>
        
        <p className="text-xl text-on-surface-variant mb-8 max-w-2xl mx-auto leading-relaxed">
          {t('home.trackProgress')}
        </p>

        <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/5 inline-block">
          <p className="text-on-surface font-medium flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            {t('home.adminOnly')}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-surface-container-low/30 rounded-2xl">
            <h3 className="font-bold text-primary mb-2">Board Access</h3>
            <p className="text-sm text-on-surface-variant">Only authorized board members can access the attendance management system.</p>
          </div>
          <div className="p-6 bg-surface-container-low/30 rounded-2xl">
            <h3 className="font-bold text-primary mb-2">Real-time Tracking</h3>
            <p className="text-sm text-on-surface-variant">Attendance is automatically matched and recorded for each session.</p>
          </div>
          <div className="p-6 bg-surface-container-low/30 rounded-2xl">
            <h3 className="font-bold text-primary mb-2">Data Analytics</h3>
            <p className="text-sm text-on-surface-variant">Visualize attendance trends and student engagement through our dashboard.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
