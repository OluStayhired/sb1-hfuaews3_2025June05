import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { CheckEmailPage } from './pages/CheckEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage'; // NEW: Import ResetPasswordPage
import { CheckEmailForResetPage } from './pages/CheckEmailForResetPage'; // NEW: Import CheckEmailForResetPage
import { NewPasswordPage } from './pages/NewPasswordPage'; // NEW: Import NewPasswordPage (future step)

import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
import LinkedInAuthRedirect from './components/LinkedInAuthRedirect'; 
import { ThemeProvider } from './context/ThemeContext';
import { HooksProvider } from './context/HooksContext';


function PrivateRoute({ children }: { children: React.ReactNode }) {
  //const { isAuthenticated } = useAuth();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  //if (isLoading) {
    //return <div>Loading...</div>;
  //}

  // **Show loading state while authentication status is being determined**
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }


  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/" state={{ from: location }} replace />
  );
}

// AppRoutes component
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} /> {/* NEW: Add route for CheckEmailPage */}
      <Route path="/reset-password" element={<ResetPasswordPage />} /> {/* NEW: Route for Reset Password Request */}
      <Route path="/check-email-for-reset" element={<CheckEmailForResetPage />} /> {/* NEW: Route for Reset Confirmation */}
      <Route path="/update-password" element={<NewPasswordPage />} />
      <Route
        path="/dashboard/*"
        element={
          <PrivateRoute>
            {/*
              Wrap Dashboard with HooksProvider here.
              Dashboard and its children (like ContentCalendarModal)
              will now have access to hooksData via useHooks().
            */}
            <HooksProvider>
              <Dashboard />
            </HooksProvider>
          </PrivateRoute>
        }
      />
      {/*<Route path="/linkedin-auth" element={<LinkedInAuthRedirect />} />  If you still need this route */}
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;