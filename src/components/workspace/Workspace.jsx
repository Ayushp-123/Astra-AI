import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import PDFViewer from './PDFViewer';
import SummaryTab from './SummaryTab';
import FlashcardsTab from './FlashcardsTab';
import QuizTab from './QuizTab';
import ChatPanel from './ChatPanel';
import { ArrowLeft, FileText, Layers, Sparkles, HelpCircle } from 'lucide-react';

const Workspace = () => {
  const { 
    getSelectedSubject, 
    setSelectedSubject, 
    getDocumentsForSubject,
    selectedDocumentId,
    setSelectedDocumentId,
    activeWorkspaceTab,
    setActiveWorkspaceTab
  } = useStore();

  const selectedSubject = getSelectedSubject();

  if (!selectedSubject) return null;

  const subjectDocs = getDocumentsForSubject(selectedSubject.id);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col min-h-[calc(100vh-140px)]"
    >
      {/* Workspace Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedSubject(null)}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
            title="Back to Subjects"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{selectedSubject.name}</h1>
              <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-medium">
                {subjectDocs.length} Document{subjectDocs.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">Subject Workspace & AI Study Assistant</p>
          </div>
        </div>

        {/* Document Switcher (if multiple documents exist in this subject) */}
        {subjectDocs.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedDocumentId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                selectedDocumentId === null
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              All Notes ({subjectDocs.length})
            </button>
            {subjectDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocumentId(doc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 truncate max-w-[180px] cursor-pointer ${
                  selectedDocumentId === doc.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title={doc.name}
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{doc.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Workspace Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Left Column: Tabbed View (Notes vs Summary vs Flashcards vs Quiz) */}
        <div className="flex flex-col h-[650px] lg:h-[720px]">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl w-fit mb-3 backdrop-blur-md overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveWorkspaceTab('notes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeWorkspaceTab === 'notes'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Extracted Notes
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('summary')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeWorkspaceTab === 'summary'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              Study Summary
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('flashcards')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeWorkspaceTab === 'flashcards'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-pink-300" />
              Flashcards
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('quiz')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeWorkspaceTab === 'quiz'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-300" />
              Practice Quiz
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeWorkspaceTab === 'notes' && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full"
                >
                  <PDFViewer />
                </motion.div>
              )}
              {activeWorkspaceTab === 'summary' && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full"
                >
                  <SummaryTab />
                </motion.div>
              )}
              {activeWorkspaceTab === 'flashcards' && (
                <motion.div
                  key="flashcards"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full"
                >
                  <FlashcardsTab />
                </motion.div>
              )}
              {activeWorkspaceTab === 'quiz' && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full"
                >
                  <QuizTab />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: AI Assistant Chat */}
        <div className="flex flex-col h-[650px] lg:h-[720px] lg:pt-11 pt-0">
          <ChatPanel />
        </div>
      </div>
    </motion.div>
  );
};

export default Workspace;


