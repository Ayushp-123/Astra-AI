import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Activity, Clock } from 'lucide-react';

const SubjectCard = ({ subject, onClick, index }) => {
  // Generate a mock color and stats based on the subject name for the demo
  const colors = [
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-500'
  ];
  
  const colorIndex = subject.length % colors.length;
  const gradient = colors[colorIndex];
  
  // Mock stats
  const docsCount = (subject.length % 5) + 1;
  const lastActive = "Just now";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="group relative rounded-3xl p-6 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl hover:shadow-purple-500/10"
    >
      {/* Background Hover Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} rounded-full blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} p-0.5 shadow-lg`}>
            <div className="w-full h-full bg-gray-900 rounded-[14px] flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="p-2 rounded-full bg-white/5 text-gray-400 group-hover:bg-white/20 group-hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
          {subject}
        </h3>
        
        <div className="mt-auto pt-6 flex items-center gap-4 text-xs font-medium text-gray-500">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            {docsCount} document{docsCount > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {lastActive}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubjectCard;
