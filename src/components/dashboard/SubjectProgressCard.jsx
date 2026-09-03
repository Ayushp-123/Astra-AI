import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, Award } from 'lucide-react';

const SubjectProgressCard = ({ subject, progressData, onSelect }) => {
  const { status, progress, label, docCount, quizScore } = progressData || {
    status: 'In Progress',
    progress: null,
    label: 'In Progress',
    docCount: 0,
    quizScore: null
  };

  const statusColors = {
    'Strong': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Practicing': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'In Progress': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Not Started': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  const badgeClass = statusColors[status] || statusColors['In Progress'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={() => onSelect(subject.id)}
      className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/40 backdrop-blur-md shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
            {status}
          </span>
        </div>

        <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mb-1 truncate">
          {subject.name}
        </h4>
        <p className="text-xs text-gray-400 font-mono">
          {docCount} Document{docCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
        {/* Progress Bar if real progress exists */}
        {progress !== null ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-gray-400">Study Progress</span>
              <span className="text-white font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-gray-500 font-mono py-1">
            <span>{label}</span>
            {quizScore !== null && (
              <span className="flex items-center gap-1 text-indigo-300">
                <Award className="w-3.5 h-3.5" /> {quizScore}%
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-purple-400 font-medium group-hover:translate-x-0.5 transition-transform pt-1">
          <span>Open Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};

export default SubjectProgressCard;
