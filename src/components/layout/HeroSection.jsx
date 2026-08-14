import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const HeroSection = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="mb-16 text-center md:text-left"
    >
      <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
        Turn Study Chaos <br />
        Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Clarity</span>
      </h1>

      <p className="mt-5 text-gray-400 text-lg md:text-xl max-w-2xl mx-auto md:mx-0 leading-relaxed">
        Upload scattered PDFs, screenshots and notes. ASTRA automatically organizes everything into structured, searchable intelligence using AI.
      </p>

      {/* Global Search Mockup (Visual only for now) */}
      <div className="mt-10 relative max-w-xl mx-auto md:mx-0">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search all your notes, topics, concepts..."
          className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-purple-500 focus:bg-white/10 transition-all duration-300 text-white placeholder-gray-500 shadow-xl"
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          <span className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded-md">Ctrl K</span>
        </div>
      </div>
    </motion.div>
  );
};

export default HeroSection;
