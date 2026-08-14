import { Sparkles, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10 relative z-10 bg-black/50 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2"
      >
        <Sparkles className="w-8 h-8 text-purple-500" />
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
          ASTRA
        </h1>
      </motion.div>

      <div className="hidden md:flex items-center gap-6">
        <a href="#" className="text-gray-400 hover:text-white transition">Features</a>
        <a href="#" className="text-gray-400 hover:text-white transition">Pricing</a>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300"
        >
          Login
        </motion.button>
      </div>

      <button className="md:hidden text-white">
        <Menu className="w-6 h-6" />
      </button>
    </nav>
  );
};

export default Navbar;
