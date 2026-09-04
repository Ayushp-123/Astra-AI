import { useState, useRef, useEffect } from 'react';
import { Sparkles, LayoutDashboard, BookOpen, LogIn, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { getUserDisplayName, getUserInitials } from '../../services/authService';

const Navbar = () => {
  const { setSelectedSubject, activeView, setActiveView, user, signOutUser } = useStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHomeClick = () => {
    setSelectedSubject(null);
    setActiveView('home');
  };

  const handleDashboardClick = () => {
    setSelectedSubject(null);
    setActiveView('dashboard');
  };

  return (
    <nav className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 relative z-30 bg-black/50 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleHomeClick}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <Sparkles className="w-7 h-7 text-purple-500 group-hover:rotate-12 transition-transform duration-300" />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
          ASTRA
        </h1>
      </motion.div>

      {/* Navigation Actions */}
      <div className="flex items-center gap-3">
        {/* View Switchers */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl">
          <button
            onClick={handleHomeClick}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'home' || activeView === 'workspace'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>
          <button
            onClick={handleDashboardClick}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Local Storage Privacy Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local Storage</span>
        </div>

        {/* Authentication Controls */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs text-white font-mono shadow-sm">
                {initials}
              </div>
              <span className="text-xs font-semibold text-white max-w-[100px] truncate hidden sm:inline-block">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#14141d] border border-white/10 shadow-2xl p-2 z-50 backdrop-blur-xl"
                >
                  <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                    <p className="text-xs font-bold text-white truncate">{displayName}</p>
                    <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleDashboardClick();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                  >
                    <LayoutDashboard className="w-4 h-4 text-purple-400" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setActiveView('profile');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                  >
                    <UserIcon className="w-4 h-4 text-indigo-400" />
                    <span>Profile & Settings</span>
                  </button>

                  <div className="border-t border-white/10 my-1" />

                  <button
                    onClick={async () => {
                      setDropdownOpen(false);
                      await signOutUser();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => setActiveView('login')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
