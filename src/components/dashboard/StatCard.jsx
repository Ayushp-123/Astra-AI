import { motion } from 'framer-motion';

const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = 'purple' }) => {
  const colorMap = {
    purple: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    pink: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400'
  };

  const scheme = colorMap[color] || colorMap.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${scheme} border`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-3xl font-extrabold text-white tracking-tight font-mono">
          {value !== null && value !== undefined ? value : '—'}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-between">
            <span>{subtitle}</span>
            {trend && <span className="text-purple-300 font-medium">{trend}</span>}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
