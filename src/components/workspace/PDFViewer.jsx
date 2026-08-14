import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { FileText, Search, ListChecks } from 'lucide-react';
import { generateKeyPoints } from '../../services/aiService';

const PDFViewer = () => {
  const { notesText, keyPoints, setKeyPoints } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingPoints, setGeneratingPoints] = useState(false);

  const handleGeneratePoints = async () => {
    if (generatingPoints || keyPoints.length > 0) return;
    setGeneratingPoints(true);
    const points = await generateKeyPoints(notesText.substring(0, 5000)); // Send chunk
    setKeyPoints(points);
    setGeneratingPoints(false);
  };

  // Simple highlight mechanism for client-side search
  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={i} className="bg-purple-500/50 text-white px-1 rounded">{part}</span> : part
    );
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-purple-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Extracted Notes</h2>
            <p className="text-xs text-gray-400 mt-0.5">AI processed text from documents</p>
          </div>
        </div>
        
        <button 
          onClick={handleGeneratePoints}
          disabled={generatingPoints}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20"
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

      {/* Search Bar */}
      <div className="px-6 py-4 border-b border-white/10 bg-black/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search within notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                <span className="text-purple-500 mt-0.5">•</span>
                <span>{point}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {notesText ? (
          <div className="text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
            {searchTerm ? highlightText(notesText, searchTerm) : notesText}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
            <FileText className="w-12 h-12 opacity-20" />
            <p>No text extracted yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
