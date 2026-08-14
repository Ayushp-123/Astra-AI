import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import PDFViewer from './PDFViewer';
import ChatPanel from './ChatPanel';
import { ArrowLeft } from 'lucide-react';

const Workspace = () => {
  const { selectedSubject, setSelectedSubject } = useStore();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-[calc(100vh-100px)]"
    >
      <div className="mb-6 flex items-center gap-4">
        <button 
          onClick={() => setSelectedSubject(null)}
          className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">{selectedSubject}</h1>
          <p className="text-sm text-gray-400">Workspace & AI Analysis</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 pb-6">
        <div className="h-full min-h-[500px]">
          <PDFViewer />
        </div>
        <div className="h-full min-h-[500px]">
          <ChatPanel />
        </div>
      </div>
    </motion.div>
  );
};

export default Workspace;
