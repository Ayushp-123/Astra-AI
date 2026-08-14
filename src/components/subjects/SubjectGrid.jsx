import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import SubjectCard from './SubjectCard';

const SubjectGrid = () => {
  const { subjects, setSelectedSubject } = useStore();

  if (!subjects || subjects.length === 0) return null;

  return (
    <div className="mt-16 relative z-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Knowledge Structure
          </h2>
          <p className="text-gray-400">
            AI has organized your notes into these subjects.
          </p>
        </div>
        
        <div className="hidden sm:flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300">
            {subjects.length} Subjects Detected
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {subjects.map((subject, index) => (
          <SubjectCard
            key={index}
            subject={subject}
            index={index}
            onClick={() => setSelectedSubject(subject)}
          />
        ))}
      </div>
    </div>
  );
};

export default SubjectGrid;
