import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import RedditConnectModal from '../components/RedditConnectModal';
import { useLocation } from 'react-router-dom';

type RedditAccountContextType = {
  hasRedditAccounts: boolean;
  isLoading: boolean;
  connectRedditAccount: () => void;
  refreshAccountStatus: () => Promise<void>;
};

const RedditAccountContext = createContext<RedditAccountContextType>({
  hasRedditAccounts: false,
  isLoading: true,
  connectRedditAccount: () => {},
  refreshAccountStatus: async () => {},
});

export const useRedditAccounts = () => useContext(RedditAccountContext);

export const RedditAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [hasRedditAccounts, setHasRedditAccounts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRedditConnectModal, setShowRedditConnectModal] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  
  // Track if modal has been dismissed on the current page
  const [modalDismissedOnCurrentPage, setModalDismissedOnCurrentPage] = useState(false);
  // Ref to track if we've checked for accounts on this page load
  const checkedOnCurrentPageRef = useRef(false);
  // Ref to track the last pathname to avoid duplicate checks for the same path
  const lastPathCheckedRef = useRef('');
  // Track if user is authenticated to avoid unnecessary checks
  const isAuthenticatedRef = useRef(false);
  
  // List of public paths where we should never show the Reddit connect modal
  const publicPaths = ['/', '/login', '/pricing', '/subscription', '/auth/callback'];
  
  // Check if current path is a public path
  const isPublicPath = () => {
    return publicPaths.some(path => location.pathname === path || location.pathname.startsWith(path));
  };
  
  // Check if user has an active subscription
  const checkSubscription = async () => {
    if (!user) {
      setSubscriptionLoading(false);
      setHasSubscription(false);
      return false;
    }
    
    try {
      console.log(`RedditAccountContext: Checking subscription for user ${user.id}...`);
      setSubscriptionLoading(true);
      
      // Check both subscription tables
      let hasActiveSubscription = false;
      
      // 1. Check the subscriptions table
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscriptionError) {
        console.error('RedditAccountContext: Error checking subscriptions table:', subscriptionError);
      }
      
      if (subscriptionData) {
        console.log('RedditAccountContext: Found active subscription in subscriptions table');
        hasActiveSubscription = true;
      } else {
        // 2. Check the customer_subscriptions table
        console.log('RedditAccountContext: Checking customer_subscriptions table...');
        
        let { data: customerSubscriptionData, error: customerSubscriptionError } = await supabase
          .from('customer_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .or('status.eq.active,status.eq.trialing')
          .maybeSingle();

        if (customerSubscriptionError) {
          console.error('RedditAccountContext: Error checking customer_subscriptions table:', customerSubscriptionError);
          console.log('RedditAccountContext: No subscription found with OR condition, trying individual queries');
            
          // Try active status
          const { data: activeData, error: activeError } = await supabase
            .from('customer_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();
              
          if (activeError) {
            console.error('RedditAccountContext: Error checking active subscriptions:', activeError);
          }
            
          if (activeData) {
            console.log('RedditAccountContext: Found active subscription in customer_subscriptions table');
            customerSubscriptionData = activeData;
            customerSubscriptionError = null;
          } else {
            // Try trialing status
            const { data: trialingData, error: trialingError } = await supabase
              .from('customer_subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .eq('status', 'trialing')
              .maybeSingle();
                
            if (trialingError) {
              console.error('RedditAccountContext: Error checking trialing subscriptions:', trialingError);
            }
              
            if (trialingData) {
              console.log('RedditAccountContext: Found trialing subscription in customer_subscriptions table');
              customerSubscriptionData = trialingData;
              customerSubscriptionError = null;
            }
          }
        }
        
        if (customerSubscriptionData) {
          console.log('RedditAccountContext: Found subscription in customer_subscriptions table');
          hasActiveSubscription = true;
        }
      }

      console.log('RedditAccountContext: Setting hasSubscription to:', hasActiveSubscription);
      setHasSubscription(hasActiveSubscription);
      return hasActiveSubscription;
    } catch (error) {
      console.error('RedditAccountContext: Exception checking subscription:', error);
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  };
  
  // Check if the user has any Reddit accounts
  const checkForRedditAccounts = async () => {
    if (!user) {
      setIsLoading(false);
      setShowRedditConnectModal(false);
      return;
    }
    
    // Don't check if we're on a public path
    if (isPublicPath()) {
      console.log('RedditAccountContext: On public path, not showing Reddit connect modal');
      setShowRedditConnectModal(false);
      return;
    }
    
    // Don't check if we've already checked on this page and the modal was dismissed
    if (checkedOnCurrentPageRef.current && modalDismissedOnCurrentPage) {
      return;
    }
    
    // Don't show modal if user doesn't have a subscription
    if (!hasSubscription) {
      console.log('RedditAccountContext: User has no subscription, not showing Reddit connect modal');
      setShowRedditConnectModal(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
        
      if (error) throw error;
      
      const hasAccounts = data && data.length > 0;
      setHasRedditAccounts(hasAccounts);
      
      console.log('RedditAccountContext: Reddit accounts check:', hasAccounts ? 'Has accounts' : 'No accounts');
      
      // Show modal if user has no Reddit accounts, has a subscription, isn't on a public page, and hasn't dismissed it
      if (!hasAccounts && !modalDismissedOnCurrentPage && hasSubscription && !isPublicPath()) {
        console.log('RedditAccountContext: Showing Reddit connect modal');
        setShowRedditConnectModal(true);
      } else {
        console.log('RedditAccountContext: Not showing Reddit connect modal');
        setShowRedditConnectModal(false);
      }
      
      // Mark that we've checked on this page
      checkedOnCurrentPageRef.current = true;
    } catch (err) {
      console.error('RedditAccountContext: Error checking for Reddit accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Public function to refresh account status
  const refreshAccountStatus = async () => {
    console.log('RedditAccountContext: Manually refreshing account status');
    // Reset the checked flag when manually refreshing
    checkedOnCurrentPageRef.current = false;
    // Check subscription status first
    await checkSubscription();
    // Then check for Reddit accounts
    await checkForRedditAccounts();
  };
  
  // Connect Reddit account
  const connectRedditAccount = () => {
    // Generate a random state string for security
    const state = Math.random().toString(36).substring(7);
    
    // Store state in session storage to verify on callback
    sessionStorage.setItem('reddit_oauth_state', state);

    // Construct the OAuth URL with expanded scopes
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_REDDIT_APP_ID,
      response_type: 'code',
      state,
      redirect_uri: `${window.location.origin}/auth/reddit/callback`,
      duration: 'permanent',
      scope: [
        'identity',
        'read',
        'submit',
        'subscribe',
        'history',
        'mysubreddits',
        'privatemessages',
        'save',
        'vote',
        'edit',
        'flair',
        'report'
      ].join(' ')
    });

    // Redirect to Reddit's OAuth page
    window.location.href = `https://www.reddit.com/api/v1/authorize?${params}`;
  };
  
  // Handle modal close - track dismissal for current page only
  const handleModalClose = () => {
    console.log('RedditAccountContext: Modal dismissed for current page');
    setShowRedditConnectModal(false);
    setModalDismissedOnCurrentPage(true);
  };
  
  // Check for subscription status when the component mounts and when the user changes
  useEffect(() => {
    if (user) {
      if (!isAuthenticatedRef.current) {
        console.log('RedditAccountContext: User authenticated, checking subscription');
        isAuthenticatedRef.current = true;
        
        // Check subscription status first
        const timer = setTimeout(() => {
          checkSubscription().then(() => {
            // Only check for Reddit accounts after subscription check completes
            checkForRedditAccounts();
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    } else {
      isAuthenticatedRef.current = false;
      setHasRedditAccounts(false);
      setHasSubscription(false);
      setIsLoading(false);
      setSubscriptionLoading(false);
      setShowRedditConnectModal(false);
      checkedOnCurrentPageRef.current = false;
    }
  }, [user]);
  
  // Reset modal dismissed state when location changes (navigating to a new page)
  useEffect(() => {
    // Only reset dismissed state and check if:
    // 1. User is authenticated
    // 2. The path has actually changed
    // 3. We're not on a public path
    if (user && 
        lastPathCheckedRef.current !== location.pathname && 
        !isPublicPath()) {
      console.log('RedditAccountContext: Location changed to:', location.pathname);
      console.log('RedditAccountContext: Resetting modal dismissed state');
      
      // Update our ref to the current path
      lastPathCheckedRef.current = location.pathname;
      
      // Reset flags for the new page
      setModalDismissedOnCurrentPage(false);
      checkedOnCurrentPageRef.current = false;
      
      // Check subscription status first, then check for Reddit accounts
      const timer = setTimeout(() => {
        if (hasSubscription) {
          checkForRedditAccounts();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, user, hasSubscription]);
  
  return (
    <RedditAccountContext.Provider
      value={{
        hasRedditAccounts,
        isLoading,
        connectRedditAccount,
        refreshAccountStatus,
      }}
    >
      {children}
      
      {/* Global Reddit Connect Modal - Only show on backend pages after subscription check */}
      <RedditConnectModal
        isOpen={showRedditConnectModal}
        onClose={handleModalClose}
        onConnect={connectRedditAccount}
      />
    </RedditAccountContext.Provider>
  );
}; 