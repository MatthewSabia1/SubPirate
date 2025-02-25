import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeatureAccessProvider } from './contexts/FeatureAccessContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import SubredditAnalysis from './pages/SubredditAnalysis';
import Projects from './pages/Projects';
import Calendar from './pages/Calendar';
import ProjectView from './pages/ProjectView';
import SavedList from './pages/SavedList';
import SpyGlass from './pages/SpyGlass';
import RedditAccounts from './pages/RedditAccounts';
import RedditOAuthCallback from './pages/RedditOAuthCallback';
import AuthCallback from './pages/AuthCallback';
import Pricing from './pages/Pricing';
import LandingPage from './pages/LandingPage';
import { Menu } from 'lucide-react';
import { useRedirectHandler } from './lib/useRedirectHandler';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex">
      <Sidebar isMobileOpen={isSidebarOpen} onMobileClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 md:hidden z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#111111] border-b border-[#333333] md:hidden z-10 flex items-center px-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-gray-400 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <Menu size={24} />
        </button>
      </div>
      
      <main className="flex-1 md:ml-[240px] p-4 md:p-8 mt-16 md:mt-0">
        {children}
      </main>
    </div>
  );
}

function App() {
  // Use the redirect handler on all routes
  useRedirectHandler();
  
  return (
    <AuthProvider>
      <FeatureAccessProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/reddit/callback" element={
                <PrivateRoute>
                  <RedditOAuthCallback />
                </PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/saved" element={
                <PrivateRoute>
                  <SavedList />
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              } />
              <Route path="/analytics" element={
                <PrivateRoute>
                  <Analytics />
                </PrivateRoute>
              } />
              <Route path="/analysis/:subreddit" element={
                <PrivateRoute>
                  <SubredditAnalysis />
                </PrivateRoute>
              } />
              <Route path="/projects" element={
                <PrivateRoute>
                  <Projects />
                </PrivateRoute>
              } />
              <Route path="/projects/:projectId" element={
                <PrivateRoute>
                  <ProjectView />
                </PrivateRoute>
              } />
              <Route path="/calendar" element={
                <PrivateRoute>
                  <Calendar />
                </PrivateRoute>
              } />
              <Route path="/spyglass" element={
                <PrivateRoute>
                  <SpyGlass />
                </PrivateRoute>
              } />
              <Route path="/accounts" element={
                <PrivateRoute>
                  <RedditAccounts />
                </PrivateRoute>
              } />
            </Routes>
          </Router>
        </QueryClientProvider>
      </FeatureAccessProvider>
    </AuthProvider>
  );
}

export default App;