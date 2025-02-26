import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeatureAccessProvider } from './contexts/FeatureAccessContext';
import { RedditAccountProvider, useRedditAccounts } from './contexts/RedditAccountContext';
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
import SubscriptionPage from './pages/SubscriptionPage';
import LandingPage from './pages/LandingPage';
import { Menu } from 'lucide-react';
import { useRedirectHandler } from './lib/useRedirectHandler';
import { ErrorBoundary } from 'react-error-boundary';
import { supabase } from './lib/supabase';

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
  // Force a refresh of account status when loading a private route
  const { refreshAccountStatus, isLoading: redditAccountsLoading } = useRedditAccounts();
  // Track if we've already checked the account status for this component instance
  const [hasCheckedAccounts, setHasCheckedAccounts] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const navigate = useNavigate();
  
  // Check if user has a subscription
  useEffect(() => {
    async function checkSubscription() {
      if (!user) return;
      
      try {
        console.log(`Checking subscription for user ${user.id}...`);
        setSubscriptionLoading(true);
        
        // Check both subscription tables
        let hasActiveSubscription = false;
        
        // 1. Check the subscriptions table
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (subscriptionError) {
          if (subscriptionError.code === 'PGRST116') {
            console.log('No active subscription found in subscriptions table');
          } else {
            console.error('Error checking subscriptions table:', subscriptionError);
          }
        }
        
        if (subscriptionData) {
          console.log('Found active subscription in subscriptions table:', subscriptionData);
          hasActiveSubscription = true;
        } else {
          // 2. Check the customer_subscriptions table if no subscription found in the first table
          console.log('Checking customer_subscriptions table...');
          
          // First try with OR condition
          let { data: customerSubscriptionData, error: customerSubscriptionError } = await supabase
            .from('customer_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .or('status.eq.active,status.eq.trialing')
            .single();
  
          if (customerSubscriptionError) {
            if (customerSubscriptionError.code === 'PGRST116') {
              console.log('No subscription found with OR condition, trying individual queries');
              
              // Try active status
              const { data: activeData, error: activeError } = await supabase
                .from('customer_subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();
                
              if (!activeError && activeData) {
                console.log('Found active subscription in customer_subscriptions table:', activeData);
                customerSubscriptionData = activeData;
                customerSubscriptionError = null;
              } else {
                // Try trialing status
                const { data: trialingData, error: trialingError } = await supabase
                  .from('customer_subscriptions')
                  .select('*')
                  .eq('user_id', user.id)
                  .eq('status', 'trialing')
                  .single();
                  
                if (!trialingError && trialingData) {
                  console.log('Found trialing subscription in customer_subscriptions table:', trialingData);
                  customerSubscriptionData = trialingData;
                  customerSubscriptionError = null;
                }
              }
            } else {
              console.error('Error checking customer_subscriptions table:', customerSubscriptionError);
            }
          }
          
          if (customerSubscriptionData) {
            console.log('Found subscription in customer_subscriptions table:', customerSubscriptionData);
            hasActiveSubscription = true;
          } else {
            console.log('No active subscription found in any table for user', user.id);
          }
        }

        console.log('Setting hasSubscription to:', hasActiveSubscription);
        setHasSubscription(hasActiveSubscription);
      } catch (error) {
        console.error('Exception checking subscription:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    }

    if (user) {
      checkSubscription();
    }
  }, [user]);
  
  // Use an effect to check for Reddit accounts when this component mounts, but only once
  useEffect(() => {
    if (user && !redditAccountsLoading && !hasCheckedAccounts) {
      console.log('PrivateRoute: Initial Reddit account status check');
      refreshAccountStatus();
      setHasCheckedAccounts(true);
    }
  }, [user, redditAccountsLoading, refreshAccountStatus, hasCheckedAccounts]);

  // If subscription check is complete and user doesn't have a subscription, redirect them
  useEffect(() => {
    const currentPath = window.location.pathname;
    console.log('PrivateRoute: Checking redirect conditions:', { 
      user: !!user, 
      loading: subscriptionLoading, 
      hasSubscription, 
      path: currentPath 
    });
    
    if (user && !subscriptionLoading && !hasSubscription && currentPath !== '/subscription') {
      console.log('PrivateRoute: Redirecting to subscription page from', currentPath);
      navigate('/subscription', { 
        replace: true,
        state: { newUser: false } // Explicitly mark as not a new user
      });
    }
  }, [user, subscriptionLoading, hasSubscription, navigate]);

  if (loading || subscriptionLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Allow the subscription page to be accessed even without a subscription
  if (!hasSubscription && window.location.pathname !== '/subscription') {
    console.log('PrivateRoute: Final check redirect to subscription page');
    return <Navigate to="/subscription" state={{ newUser: false }} replace />;
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

// Simple error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="mb-4 text-red-400">{error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}

function App() {
  // Use the redirect handler on all routes with error protection
  try {
    useRedirectHandler();
  } catch (error) {
    console.error("Failed to initialize redirect handler:", error);
  }
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <FeatureAccessProvider>
          <QueryClientProvider client={queryClient}>
            <Router>
              <RedditAccountProvider>
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
                  <Route path="/subscription" element={<SubscriptionPage />} />
                </Routes>
              </RedditAccountProvider>
            </Router>
          </QueryClientProvider>
        </FeatureAccessProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;