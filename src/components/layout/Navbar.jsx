import { Sparkles, LayoutDashboard, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';

const Navbar = () => {
  const { setSelectedSubject, activeView, setActiveView } = useStore();

  const handleHomeClick = () => {
    setSelectedSubject(null);
    setActiveView('home');
  };

  const handleDashboardClick = () => {
    setSelectedSubject(null);
    setActiveView('dashboard');
  };

  return (
    <nav className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 relative z-10 bg-black/50 backdrop-blur-md">
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
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local Storage</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
