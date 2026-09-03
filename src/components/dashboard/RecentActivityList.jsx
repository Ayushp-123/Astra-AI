import { motion } from 'framer-motion';
import { 
  FileText, 
  Sparkles, 
  Layers, 
  Trophy, 
  BookOpen, 
  Clock 
} from 'lucide-react';

function formatRelativeTime(isoString) {
  if (!isoString) return 'Recently';
  try {
    const now = Date.now();
    const past = new Date(isoString).getTime();
    const diffMinutes = Math.floor((now - past) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

const RecentActivityList = ({ activities = [] }) => {
  const getEventIcon = (type) => {
    switch (type) {
      case 'document_uploaded':
      case 'document_opened':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'summary_generated':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'flashcard_completed':
        return <Layers className="w-4 h-4 text-pink-400" />;
      case 'quiz_completed':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-white/5 border border-white/10 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
        <p className="text-sm font-medium text-gray-400">No study activity yet</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Your uploaded documents, summaries, flashcards, and quiz results will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
          Recent Study Activity
        </h3>
        <span className="text-xs text-gray-400 font-mono">
          {activities.length} Events
        </span>
      </div>

      <div className="divide-y divide-white/5">
        {activities.slice(0, 8).map((event, idx) => (
          <motion.div
            key={event.id || idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="py-3.5 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex-shrink-0">
                {getEventIcon(event.type)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {event.title}
                </p>
                {event.percentage !== null && event.percentage !== undefined && (
                  <p className="text-[11px] text-amber-300 font-mono">
                    Score: {event.percentage}%
                  </p>
                )}
              </div>
            </div>

            <span className="text-[11px] text-gray-500 font-mono flex-shrink-0">
              {formatRelativeTime(event.timestamp)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivityList;
