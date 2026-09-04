import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { authService, getUserDisplayName, getUserInitials } from '../../services/authService';
import { 
  User, 
  Mail, 
  Calendar, 
  HardDrive, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  RotateCw, 
  LogOut 
} from 'lucide-react';

const Profile = () => {
  const { user, setUser, signOutUser, setActiveView } = useStore();

  const currentDisplayName = getUserDisplayName(user);
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const initials = getUserInitials(user);
  const email = user?.email || 'student@university.edu';
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Active session';

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setSaveError('Display name cannot be empty.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const result = await authService.updateProfile({ displayName: displayName.trim() });

    if (result.error) {
      setSaveError(result.error);
      setSaving(false);
    } else {
      if (result.user) {
        setUser(result.user);
      }
      setSaving(false);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto my-8 space-y-6"
    >
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-300">
          Account Settings
        </span>
      </div>

      {/* Main Profile Card */}
      <div className="p-8 rounded-3xl bg-gradient-to-b from-[#161622] to-[#0d0d14] border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[90px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-0.5 shadow-xl shadow-purple-500/25 flex-shrink-0">
              <div className="w-full h-full rounded-[22px] bg-[#12121c] flex items-center justify-center font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-tr from-purple-300 to-indigo-200 font-mono">
                {initials}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">
                {currentDisplayName || 'Student'}
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{email}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Save feedback alerts */}
        {saveSuccess && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-300 text-xs">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Profile name updated successfully!</span>
          </div>
        )}

        {saveError && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Profile Details List */}
        <div className="mt-8 space-y-5 relative z-10">
          {/* Display Name Row */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                  Display Name
                </span>
                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-black/50 border border-purple-500/40 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {saving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDisplayName(currentDisplayName);
                        setIsEditing(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {currentDisplayName}
                  </p>
                )}
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer self-start sm:self-center"
              >
                Edit Name
              </button>
            )}
          </div>

          {/* Email Row */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                Email Address
              </span>
              <p className="text-sm font-semibold text-white mt-0.5">{email}</p>
            </div>
          </div>

          {/* Member Since Row */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                Account Created
              </span>
              <p className="text-sm font-semibold text-white mt-0.5">{createdAt}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Local Storage & Privacy Notice Box */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/20 via-blue-950/20 to-black border border-purple-500/20 backdrop-blur-md flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 mt-0.5">
          <HardDrive className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white">Local-First Storage Architecture</h4>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
              IndexedDB Active
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Your ASTRA account handles authentication. Your study materials, extracted notes, summaries, flashcards, and quizzes are currently stored locally on this device.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
