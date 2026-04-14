import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';

// Pages (to be created)
import Login from './pages/Login';
import Register from './pages/Register';
import ApplicantHome from './pages/ApplicantHome';
import ApplicantTeams from './pages/ApplicantTeams';
import Profile from './pages/Profile';
import TestPage from './pages/TestPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminQuestions from './pages/AdminQuestions';
import AdminTeams from './pages/AdminTeams';
import AdminApplicants from './pages/AdminApplicants';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppRoutes() {
  const { isAdmin, user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={isAdmin ? <Navigate to="/admin" replace /> : <ApplicantHome />} />
        <Route path="test" element={<TestPage />} />
        <Route path="teams" element={<ApplicantTeams />} />
        <Route path="profile" element={<Profile />} />
        
        {/* Admin Routes */}
        <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/questions" element={<ProtectedRoute adminOnly><AdminQuestions /></ProtectedRoute>} />
        <Route path="admin/teams" element={<ProtectedRoute adminOnly><AdminTeams /></ProtectedRoute>} />
        <Route path="admin/applicants" element={<ProtectedRoute adminOnly><AdminApplicants /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
            <Toaster position="top-right" />
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
