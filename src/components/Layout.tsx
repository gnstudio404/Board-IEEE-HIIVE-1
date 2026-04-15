import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../lib/firebase';
import { LogOut, LayoutDashboard, Users, HelpCircle, User, Menu, X, Globe, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import Logo from './Logo';

export default function Layout() {
  const { user, profile, isAdmin } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && !(event.target as Element).closest('.relative')) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = isAdmin 
    ? [
        { name: t('nav.dashboard'), path: '/admin', icon: 'dashboard' },
        { name: t('nav.students'), path: '/admin/students', icon: 'group' },
        { name: t('nav.sessions'), path: '/admin/sessions', icon: 'event' },
        { name: t('nav.attendance'), path: '/admin/attendance', icon: 'fact_check' },
        { name: t('nav.users'), path: '/admin/users', icon: 'shield_person' },
      ]
    : [
        { name: t('nav.home'), path: '/', icon: 'home' },
        { name: t('nav.profile'), path: '/profile', icon: 'account_circle' },
      ];

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background font-body text-on-surface transition-colors duration-300">
        {/* NavigationDrawer (Admin Sidebar) */}
        <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant/20 flex flex-col p-6 space-y-2 z-50 hidden md:flex">
          <div className="mb-8 px-2 flex items-center justify-center">
            <Logo className="h-20 w-auto" />
          </div>
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-headline font-medium tracking-tight",
                  location.pathname === item.path
                    ? "text-primary font-bold bg-surface-container-high shadow-sm"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                )}
              >
                <span className={cn("material-symbols-outlined", location.pathname === item.path && "fill-1")}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
          <div className="pt-6 border-t border-outline-variant/10">
            <div className="flex items-center gap-3 px-2">
              <img 
                className="w-10 h-10 rounded-full object-cover" 
                src={user?.photoURL || profile?.photoURL || "https://picsum.photos/seed/admin/200/200"} 
                alt="Admin"
                referrerPolicy="no-referrer"
              />
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-primary truncate">{profile?.name || 'Board Admin'}</p>
                <p className="text-xs text-on-surface-variant truncate">Precision Hive Control</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-lg transition-all text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              {t('nav.logout')}
            </button>
          </div>
        </aside>

        {/* TopAppBar (Admin) */}
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] z-40 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/10 shadow-[0px_12px_32px_rgba(0,76,82,0.06)] flex justify-between items-center px-8 h-16">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span 
                className="material-symbols-outlined text-primary cursor-pointer hover:bg-primary/5 p-2 rounded-lg transition-colors" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                menu
              </span>
              
              {isMenuOpen && (
                <div className={cn(
                  "absolute top-full mt-2 w-56 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-2xl z-50 py-3 animate-in fade-in zoom-in duration-200",
                  isRTL ? "right-0" : "left-0"
                )}>
                  <div className="px-4 py-2 border-b border-outline-variant/10 mb-2 md:hidden">
                    <p className="text-sm font-bold text-primary truncate">{profile?.name || 'Board Admin'}</p>
                    <p className="text-[10px] text-on-surface-variant truncate uppercase tracking-wider">Precision Hive Control</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error hover:bg-error-container/10 transition-all text-sm font-bold"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
            <h1 className="font-headline text-sm font-semibold uppercase tracking-widest text-primary">Precision Dashboard</h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={toggleTheme} className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all cursor-pointer">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </button>
            <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all cursor-pointer">
              language
            </button>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all cursor-pointer">notifications</span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all cursor-pointer">settings</span>
            <div className="h-8 w-8 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container font-bold text-xs uppercase overflow-hidden border border-primary/10">
              {user?.photoURL || profile?.photoURL ? (
                <img 
                  src={user?.photoURL || profile?.photoURL || ''} 
                  alt="Admin" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                profile?.name?.substring(0, 2) || 'AD'
              )}
            </div>
          </div>
        </header>

        {/* Main Content (Admin) */}
        <main className="md:ml-64 pt-24 px-6 md:px-10 pb-12 min-h-screen">
          <Outlet />
        </main>

        {/* Mobile Nav (Admin) */}
        <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container-lowest border-t border-outline-variant/10 md:hidden">
          <div className="flex justify-around items-center px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl",
                  location.pathname === item.path ? "text-primary bg-primary/10" : "text-on-surface-variant"
                )}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col transition-colors duration-300">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-md shadow-[0px_12px_32px_rgba(0,76,82,0.06)]">
        <div className="flex justify-between items-center px-6 py-4 w-full relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Logo className="h-12 w-auto" />
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-headline text-sm font-bold tracking-tight",
                    location.pathname === item.path 
                      ? "text-primary bg-primary/10" 
                      : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                  )}
                >
                  <span className={cn("material-symbols-outlined text-[20px]", location.pathname === item.path && "fill-1")}>
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-primary hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="p-2 rounded-lg text-primary hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined">language</span>
            </button>

            <div className="p-2 hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-primary dark:text-primary-container">notifications</span>
            </div>
            
            <div className="flex items-center gap-3 ml-2">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-primary">{profile?.name}</p>
                <p className="text-xs text-on-surface-variant capitalize">{profile?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border-2 border-primary/10">
                <img 
                  className="w-full h-full object-cover" 
                  src={user?.photoURL || profile?.photoURL || "https://picsum.photos/seed/user/200/200"} 
                  alt={profile?.name || user?.displayName || "User"}
                  referrerPolicy="no-referrer"
                />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-full transition-all"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          </div>
          <div className="bg-surface-container-low h-[1px] w-full absolute bottom-0 left-0"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-32 px-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container-lowest border-t border-surface-container-low shadow-[0_-4px_20px_rgba(0,76,82,0.04)] rounded-t-xl md:hidden">
        <div className="flex justify-around items-center px-4 py-3 pb-safe">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer px-4 py-1 rounded-xl",
                location.pathname === item.path 
                  ? "text-primary bg-surface-container-low" 
                  : "text-on-surface-variant opacity-70 hover:opacity-100"
              )}
            >
              <span className={cn("material-symbols-outlined", location.pathname === item.path && "fill-1")}>
                {item.icon}
              </span>
              <span className="font-headline text-[10px] font-bold tracking-wide uppercase mt-0.5">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
