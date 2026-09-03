import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { FileText, Search, ListChecks, Layers, Bookmark, X } from 'lucide-react';
import { generateKeyPoints } from '../../services/aiService';

const PDFViewer = () => {
  const { 
    getActiveSubjectText, 
    keyPoints, 
    setKeyPoints, 
    getSelectedSubject,
    selectedDocumentId,
    documents,
    searchTarget,
    clearSearchTarget
  } = useStore();

  const activeSearchFromTarget = (searchTarget?.matchedTerms && searchTarget.matchedTerms[0]) || searchTarget?.query || "";
  const [userSearch, setUserSearch] = useState(null);
  const searchTerm = userSearch !== null ? userSearch : activeSearchFromTarget;

  const [generatingPoints, setGeneratingPoints] = useState(false);

  const activeNotesText = getActiveSubjectText();
  const selectedSubject = getSelectedSubject();
  const activeDocument = documents.find((d) => d.id === selectedDocumentId);

  const handleGeneratePoints = async () => {
    if (generatingPoints || keyPoints.length > 0 || !activeNotesText) return;
    setGeneratingPoints(true);
    const points = await generateKeyPoints(activeNotesText.substring(0, 6000));
    setKeyPoints(points);
    setGeneratingPoints(false);
  };

  // Simple highlight mechanism for client-side search
  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={i} className="bg-purple-500/60 text-white font-semibold px-1 py-0.5 rounded shadow-sm">
          {part}
        </span> : part
    );
  };

  const headerTitle = activeDocument ? activeDocument.name : `${selectedSubject?.name || 'Subject'} Notes`;
  const headerSubtitle = activeDocument 
    ? `${activeDocument.pageCount} page${activeDocument.pageCount === 1 ? '' : 's'} • ${selectedSubject?.name}`
    : `All extracted notes for ${selectedSubject?.name || 'this subject'}`;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5">
        <div className="flex items-center gap-3 overflow-hidden mr-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-purple-500/20 flex-shrink-0">
            {activeDocument ? <FileText className="w-6 h-6 text-white" /> : <Layers className="w-6 h-6 text-white" />}
          </div>
          <div className="truncate">
            <h2 className="text-lg font-bold text-white truncate" title={headerTitle}>{headerTitle}</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{headerSubtitle}</p>
          </div>
        </div>
        
        <button 
          onClick={handleGeneratePoints}
          disabled={generatingPoints || !activeNotesText}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20 flex-shrink-0 cursor-pointer"
        >
          {generatingPoints ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <ListChecks className="w-4 h-4" />
            </motion.div>
          ) : (
            <ListChecks className="w-4 h-4" />
          )}
          {generatingPoints ? "Generating..." : "Key Points"}
        </button>
      </div>

      {/* Active Search Result Banner */}
      {searchTarget && (
        <div className="px-6 py-2.5 bg-purple-900/40 border-b border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2 truncate">
            <Bookmark className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span className="truncate">
              Navigated from search: &ldquo;<strong className="text-white">{searchTarget.query}</strong>&rdquo;
              {searchTarget.page && ` (Page ${searchTarget.page})`}
            </span>
          </div>
          <button
            onClick={() => {
              clearSearchTarget();
              setUserSearch("");
            }}
            className="p-1 hover:text-white transition-colors cursor-pointer"
            title="Dismiss search indicator"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="px-6 py-4 border-b border-white/10 bg-black/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            aria-label="Search within these notes"
            placeholder="Search within these notes..."
            value={searchTerm}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Key Points Section */}
      {keyPoints.length > 0 && (
        <div className="p-6 border-b border-white/10 bg-purple-500/5">
          <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> AI Generated Key Points
          </h3>
          <ul className="space-y-2">
            {keyPoints.map((point, idx) => (
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={idx} 
                className="text-sm text-gray-300 flex items-start gap-2"
              >
                <span className="text-purple-500 mt-0.5 font-bold">•</span>
                <span>{point}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeDocument && activeDocument.hasExtractableText === false ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-7 h-7 opacity-80" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-white mb-1">Scanned or Image-Based Document</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                This PDF appears to contain scanned image pages without an embedded digital text layer. For optimal results with ASTRA AI summaries, flashcards, and quizzes, consider using a digital PDF or OCR-processed document.
              </p>
            </div>
          </div>
        ) : activeNotesText ? (
          <div className="text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
            {searchTerm ? highlightText(activeNotesText, searchTerm) : activeNotesText}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
            <FileText className="w-12 h-12 opacity-20" />
            <p>No text extracted yet for this document.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;


