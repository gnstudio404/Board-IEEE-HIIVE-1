import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Network } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'motion/react';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if email is blocked
      const blockedDoc = await getDoc(doc(db, 'blockedEmails', email.toLowerCase()));
      if (blockedDoc.exists()) {
        toast.error(language === 'ar' ? 'هذا الحساب محظور من الدخول.' : 'This account is blocked from access.');
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      toast.success(language === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if email is blocked
      const blockedDoc = await getDoc(doc(db, 'blockedEmails', user.email?.toLowerCase() || ''));
      if (blockedDoc.exists()) {
        await auth.signOut();
        toast.error(language === 'ar' ? 'هذا الحساب محظور من الدخول.' : 'This account is blocked from access.');
        setGoogleLoading(false);
        return;
      }
      
      const path = `users/${user.uid}`;
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return;
      }

      if (!userDoc.exists()) {
        const role = user.email === 'mrmostafash187@gmail.com' ? 'admin' : 'applicant';
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: user.displayName || 'Google User',
            email: user.email,
            photoURL: user.photoURL || user.providerData[0]?.photoURL || null,
            role: role,
            completedTest: false,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
          return;
        }
      } else {
        // Sync photoURL for existing users
        try {
          await setDoc(doc(db, 'users', user.uid), {
            photoURL: user.photoURL || user.providerData[0]?.photoURL || null,
          }, { merge: true });
        } catch (e) {
          console.error("Error syncing photoURL:", e);
        }
      }
      
      toast.success(language === 'ar' ? 'تم تسجيل الدخول بواسطة جوجل!' : 'Signed in with Google!');
      navigate('/');
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error(language === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول. يرجى التأكد من عدم إغلاق النافذة المنبثقة والسماح بالـ Pop-ups في متصفحك.' : 'Sign-in popup was closed. Please make sure to complete the process and allow pop-ups in your browser.');
      } else if (error.code === 'auth/cancelled-by-user') {
        toast.error(language === 'ar' ? 'تم إلغاء عملية تسجيل الدخول.' : 'Sign-in was cancelled.');
      } else {
        toast.error(error.message || 'Failed to sign in with Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface flex items-center justify-center p-4">
      <motion.main 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden rounded-xl shadow-[0_24px_48px_-12px_rgba(0,102,110,0.08)] bg-surface-container-lowest"
      >
        {/* Left Column: Visual/Brand Side */}
        <div className="hidden md:flex md:col-span-7 relative overflow-hidden bg-primary min-h-[700px] flex-col justify-between p-12">
          {/* Background Image with Tonal Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              className="w-full h-full object-cover mix-blend-overlay opacity-40" 
              src="https://picsum.photos/seed/innovation/1920/1080"
              alt="Innovation background"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-secondary/60"></div>
          </div>
          
          {/* Brand Content */}
          <div className="relative z-10">
            <Logo className="h-12" variant="withText" />
          </div>
          
          <div className="relative z-10 max-w-md">
            <h2 className="font-headline text-5xl font-extrabold text-on-primary leading-tight mb-6">
              {language === 'ar' ? 'ملاذ الدقة للابتكار التعاوني.' : 'Precision Sanctuary for Collaborative Innovation.'}
            </h2>
            <p className="text-on-primary/80 text-lg leading-relaxed font-light">
              {language === 'ar' 
                ? 'حيث يلتقي الانضباط الهندسي بالتأثير الاجتماعي الذي يقوده الإنسان. انضم إلى نظامنا البيئي للتميز التقني والغرض المشترك.'
                : 'Where engineering rigor meets human-led social impact. Join our ecosystem of technical excellence and shared purpose.'}
            </p>
          </div>
          
          <div className="relative z-10">
            <div className="space-y-4 text-on-primary/80 text-sm font-medium">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-60 mb-1">
                  {language === 'ar' ? 'مشغل بواسطة' : 'Powered by'}
                </p>
                <p className="text-on-primary text-xl font-headline font-bold">IEEE SIGHT Egypt Section</p>
              </div>
              
              <p className="text-white">
                {language === 'ar' ? 'تصميم عمر مجدي' : 'Designed by Omar Magdy'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form Side */}
        <div className="md:col-span-5 flex flex-col justify-center p-8 md:p-16 lg:p-20 bg-surface-container-lowest">
          {/* Mobile Brand Header */}
          <div className="md:hidden flex items-center gap-2 mb-12">
            <Logo className="h-12 w-auto" variant="withText" />
          </div>
          
          <div className="mb-10">
            <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">
              {language === 'ar' ? 'مرحباً بعودتك' : 'Welcome Back'}
            </h1>
            <p className="text-on-surface-variant">
              {language === 'ar' ? 'قم بالوصول إلى لوحة التحكم التعاونية الخاصة بك.' : 'Access your collaborative dashboard.'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Input Group: Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary ml-1" htmlFor="email">
                {t('login.email')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant/50">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  className="block w-full pl-11 pr-4 py-4 bg-surface-container-low border-none rounded-lg focus:ring-0 focus:bg-surface-container-high transition-colors text-on-surface placeholder:text-on-surface-variant/40 border-l-2 border-transparent focus:border-primary" 
                  id="email" 
                  name="email" 
                  placeholder="name@company.com" 
                  required 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Input Group: Password */}
            <div className="space-y-2">
              <div className="px-1">
                <label className="text-sm font-semibold text-secondary" htmlFor="password">
                  {t('login.password')}
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant/50">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  className="block w-full pl-11 pr-4 py-4 bg-surface-container-low border-none rounded-lg focus:ring-0 focus:bg-surface-container-high transition-colors text-on-surface placeholder:text-on-surface-variant/40 border-l-2 border-transparent focus:border-primary" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end px-1">
                <a className="text-sm font-medium text-tertiary hover:underline" href="#">
                  {language === 'ar' ? 'نسيت كلمة السر؟' : 'Forgot password?'}
                </a>
              </div>
            </div>

            {/* Sign In Button */}
            <button 
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t('login.signIn')}
                  <ArrowRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-10 flex items-center">
            <div className="flex-grow h-[1px] bg-surface-container-highest"></div>
            <span className="px-4 text-sm text-on-surface-variant/60 font-medium whitespace-nowrap">
              {language === 'ar' ? 'أو تابع بواسطة' : 'or continue with'}
            </span>
            <div className="flex-grow h-[1px] bg-surface-container-highest"></div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-4 flex items-center justify-center gap-3 bg-white border border-outline-variant/30 rounded-full hover:bg-surface-container-low transition-colors text-secondary font-semibold disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                  {t('login.google')}
                </>
              )}
            </button>
          </div>

          {/* Registration Link */}
          <div className="mt-12 text-center">
            <p className="text-on-surface-variant text-sm">
              {language === 'ar' ? 'ليس لديك حساب بعد؟' : "Don't have an account yet?"} 
              <Link to="/register" className="text-tertiary font-bold hover:underline ml-1">
                {language === 'ar' ? 'انضم إلى IEEE HIIVE Board' : 'Join the IEEE HIIVE Board'}
              </Link>
            </p>
          </div>
        </div>
      </motion.main>

      {/* Aesthetic Decorative Elements */}
      <div className="fixed top-0 right-0 -z-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-tertiary/5 rounded-full blur-3xl"></div>
    </div>
  );
}
