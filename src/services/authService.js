import { supabase, isSupabaseConfigured } from './supabaseClient.js';

/**
 * ASTRA AI Authentication Service
 * 
 * Provides a clean abstraction layer over Supabase Auth.
 * Keeps UI components independent from direct Supabase API calls.
 */

/**
 * Format raw auth error into a user-friendly message
 */
export const formatAuthError = (error) => {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message || '';
  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid grant')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Password is too weak. Please choose a password with at least 6 characters.';
  }
  if (lower.includes('valid email') || lower.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox for the confirmation link or confirm your user in the Supabase Dashboard.';
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('connection')) {
    return 'Network error. Unable to connect to authentication server.';
  }
  return msg || 'An authentication error occurred. Please try again.';
};

/**
 * Retrieve user's display name from metadata or fallback to email prefix
 */
export const getUserDisplayName = (user) => {
  if (!user) return '';
  const meta = user.user_metadata || {};
  if (meta.display_name && typeof meta.display_name === 'string' && meta.display_name.trim()) {
    return meta.display_name.trim();
  }
  if (meta.full_name && typeof meta.full_name === 'string' && meta.full_name.trim()) {
    return meta.full_name.trim();
  }
  if (meta.name && typeof meta.name === 'string' && meta.name.trim()) {
    return meta.name.trim();
  }
  if (user.email) {
    const prefix = user.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return 'Student';
};

/**
 * Generate 1-2 character initials for user avatar badge
 */
export const getUserInitials = (user) => {
  const name = getUserDisplayName(user);
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const authService = {
  /**
   * Register a new user with email, password, and full display name
   */
  async signUp({ email, password, name }) {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        user: null,
        session: null,
        error: 'Supabase authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
      };
    }

    if (!email || !email.trim()) {
      return { user: null, session: null, error: 'Email address is required.' };
    }
    if (!password || password.length < 6) {
      return { user: null, session: null, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: name ? name.trim() : ''
          }
        }
      });

      if (error) {
        return { user: null, session: null, error: formatAuthError(error) };
      }

      return {
        user: data.user,
        session: data.session,
        error: null
      };
    } catch (err) {
      return { user: null, session: null, error: formatAuthError(err) };
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }) {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        user: null,
        session: null,
        error: 'Supabase authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
      };
    }

    if (!email || !email.trim() || !password) {
      return { user: null, session: null, error: 'Please provide both email and password.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        return { user: null, session: null, error: formatAuthError(error) };
      }

      return {
        user: data.user,
        session: data.session,
        error: null
      };
    } catch (err) {
      return { user: null, session: null, error: formatAuthError(err) };
    }
  },

  /**
   * Sign out current user
   */
  async signOut() {
    if (!isSupabaseConfigured() || !supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: formatAuthError(error) };
      }
      return { error: null };
    } catch (err) {
      return { error: formatAuthError(err) };
    }
  },

  /**
   * Retrieve active session from Supabase
   */
  async getCurrentSession() {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session || null;
    } catch {
      return null;
    }
  },

  /**
   * Retrieve current user from Supabase
   */
  async getCurrentUser() {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  },

  /**
   * Update display name in user metadata
   */
  async updateProfile({ displayName }) {
    if (!isSupabaseConfigured() || !supabase) {
      return { user: null, error: 'Supabase authentication is not configured.' };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName ? displayName.trim() : ''
        }
      });

      if (error) {
        return { user: null, error: formatAuthError(error) };
      }

      return { user: data.user, error: null };
    } catch (err) {
      return { user: null, error: formatAuthError(err) };
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      if (typeof callback === 'function') {
        callback(event, session);
      }
    });
  }
};
