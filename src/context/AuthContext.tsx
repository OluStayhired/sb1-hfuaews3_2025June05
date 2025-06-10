import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          setUser(session.user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        // commented out since it seems to cause a problem refreshing
        //navigate('/dashboard');
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
        setIsAuthenticated(false);
        navigate('/');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

// Start Initialize Auth for Google Login
 useEffect(() => {
    // Function to handle the initial session loading on app start
    const handleInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setSession(session);
          setUser(session.user);
          // **Crucially, clear the hash from the URL after successful processing**
          // This makes the URL cleaner and prevents potential issues if the page reloads
          if (window.location.hash) {
             console.log('Clearing URL hash after processing session.');
             window.history.replaceState({}, '', window.location.pathname);
          }
        } else {
           // No session found (neither in local storage nor URL hash)
           setSession(null);
           setUser(null);
           // Also clear hash even if no session was found there, just in case
           if (window.location.hash) {
              console.log('Clearing empty URL hash.');
              window.history.replaceState({}, '', window.location.pathname);
           }
        }
      } catch (error) {
         console.error('Error loading initial session:', error);
         setSession(null);
         setUser(null);
         // Clear hash even on error
          if (window.location.hash) {
             console.log('Clearing URL hash after error loading session.');
             window.history.replaceState({}, '', window.location.pathname);
          }
      } finally {
        setIsLoading(false); // <--- Stop loading once the initial check is complete
      }
    };

    handleInitialSession(); // Run this async function once when the provider mounts

    // Optional: Subscribe to real-time auth state changes (like token refresh, sign out)
    // This is separate from the initial load from hash/local storage but useful for keeping state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       //console.log('Auth state changed:', _event, session);
       setSession(session);
       setUser(session?.user ?? null); // Use ?? null for safety
       // Do NOT clear hash here; that should only happen on the initial redirect load
    });

    return () => {
      subscription.unsubscribe(); // Clean up the subscription on unmount
    };
  }, []); // Empty dependency array means this effect runs ONLY once on mount



  //const isAuthenticated = !!user; // <--- Derive isAuthenticated from user state

  //return (
    //<AuthContext.Provider value={{ user, session, isAuthenticated, isLoading, signOut }}>
      //{children} {/* Render children (your AppRoutes) */}
    //</AuthContext.Provider>
  //);
//};

  {/*  
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
*/}

// End Initialize Auth for Google Login

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // Note: User won't be automatically signed in until email is verified
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
  try {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  } finally {
    setIsLoading(false);
  }
};


  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
      setIsAuthenticated(false);
      setUser(null);
      navigate('/');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading,
      user,
      session,
      setSession,
      setUser,
      signUp,
      signIn,
      signInWithGoogle,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}