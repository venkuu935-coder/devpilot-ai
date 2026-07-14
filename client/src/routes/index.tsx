import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Dashboard } from '../pages/Dashboard.tsx';
import { Login } from '../pages/Login.tsx';
import { Register } from '../pages/Register.tsx';
import { ForgotPassword } from '../pages/ForgotPassword.tsx';
import { ResetPassword } from '../pages/ResetPassword.tsx';
import { VerifyEmail } from '../pages/VerifyEmail.tsx';
import { Profile } from '../pages/Profile.tsx';
import { Settings } from '../pages/Settings.tsx';
import { Projects } from '../pages/Projects.tsx';
import { AIChat } from '../pages/AIChat.tsx';
import { Documentation } from '../pages/Documentation.tsx';
import { CodeReview } from '../pages/CodeReview.tsx';
import { SecurityScan } from '../pages/SecurityScan.tsx';
import { TestGenerator } from '../pages/TestGenerator.tsx';
import { DiagramGenerator } from '../pages/DiagramGenerator.tsx';
import { AdminPanel } from '../pages/AdminPanel.tsx';
import { NotFound } from '../pages/NotFound.tsx';
import { AboutUs } from '../pages/AboutUs.tsx';
import { Support } from '../pages/Support.tsx';
import { ErrorBoundary } from '../components/layout/ErrorBoundary.tsx';
import { Sidebar } from '../components/layout/Sidebar.tsx';
import { Navbar } from '../components/layout/Navbar.tsx';

// Private Route Guard (blocks unauthenticated access)
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-955 bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Guard (prevents logged-in users from hitting login pages)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-955 bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-955 bg-slate-950 flex font-sans overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 pl-64 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-8 pt-24 max-w-6xl w-full mx-auto">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/ai-services" element={<AIChat />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/code-review" element={<CodeReview />} />
              <Route path="/security" element={<SecurityScan />} />
              <Route path="/tests" element={<TestGenerator />} />
              <Route path="/diagrams" element={<DiagramGenerator />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/support" element={<Support />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/verify-email"
        element={
          <PublicRoute>
            <VerifyEmail />
          </PublicRoute>
        }
      />

      {/* Protected Main App Layout */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      />
    </Routes>
  );
};
