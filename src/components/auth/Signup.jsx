import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { authService } from '../../services/authService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { Sparkles, User, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';

const Signup = () => {
  const { setActiveView, setUser, setSession } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  const configured = isSupabaseConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    const result = await authService.signUp({ email, password, name });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setUser(result.user);
      setSession(result.session);
      setLoading(false);

      if (result.session) {
        setActiveView('dashboard');
      } else {
        setSuccessNotice('Account created! If email confirmation is enabled on your Supabase project, please check your inbox to confirm your email.');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-md mx-auto my-8 p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#14141d] to-[#0a0a0f] border border-white/10 shadow-2xl backdrop-blur-xl relative"
    >
      {/* Back button */}
      <button
        onClick={() => setActiveView('home')}
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Notes
      </button>

      {/* Header & Logo */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 shadow-lg shadow-purple-500/20">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Create Student Account
        </h2>
        <p className="text-xs text-gray-400">
          Get started with personalized AI study features on ASTRA.
        </p>
      </div>

      {/* Unconfigured Warning */}
      {!configured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-300 text-xs mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Supabase Auth Not Configured</p>
            <p className="text-amber-300/80 mt-0.5">
              Set <code className="text-white font-mono">VITE_SUPABASE_URL</code> and <code className="text-white font-mono">VITE_SUPABASE_ANON_KEY</code> to enable live registration.
            </p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-300 text-xs mb-6">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Registration Successful</p>
            <p className="text-emerald-300/90 mt-0.5">{successNotice}</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Sign Up Failed</p>
            <p className="text-rose-300/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono mb-2">
            Your Name
          </label>
          <div className="relative flex items-center">
            <User className="absolute left-4 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ayush Patnayak"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono mb-2">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-4 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono mb-2">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock className="absolute left-4 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono mb-2">
            Confirm Password
          </label>
          <div className="relative flex items-center">
            <Lock className="absolute left-4 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer text-white"
        >
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <RotateCw className="w-4 h-4" />
            </motion.div>
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{loading ? 'Creating account...' : 'Create Account'}</span>
        </button>
      </form>

      {/* Switch to Sign In */}
      <div className="mt-8 text-center pt-6 border-t border-white/10 text-xs text-gray-400">
        Already have an account?{' '}
        <button
          onClick={() => setActiveView('login')}
          className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
        >
          Sign in
        </button>
      </div>
    </motion.div>
  );
};

export default Signup;
