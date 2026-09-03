import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { searchStudyMaterial } from '../../services/searchService';
import { Search, FileText, BookOpen, ArrowRight, X } from 'lucide-react';

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const {
    documents,
    setSelectedSubject,
    setSelectedDocumentId,
    setSearchTarget
  } = useStore();

  const results = searchStudyMaterial(query, documents, { limit: 6 });

  // Keyboard shortcuts: Ctrl+K or Cmd+K to focus, Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result) => {
    setIsOpen(false);
    setQuery("");

    // 1. Set navigation target metadata
    setSearchTarget({
      documentId: result.documentId,
      page: result.page,
      matchedTerms: result.matchedTerms,
      query: query.trim()
    });

    // 2. Select subject & document in store
    setSelectedSubject(result.subjectId);
    setSelectedDocumentId(result.documentId);
  };

  // Safe highlighted snippet rendering
  const renderHighlightedSnippet = (snippet, matchedTerms = []) => {
    if (!matchedTerms || matchedTerms.length === 0) return snippet;

    const regex = new RegExp(`(${matchedTerms.filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = snippet.split(regex);

    return parts.map((part, i) =>
      matchedTerms.some(term => term.toLowerCase() === part.toLowerCase()) ? (
        <span key={i} className="text-purple-300 font-semibold bg-purple-500/20 px-1 py-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="mb-16 text-center md:text-left"
    >
      <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
        Turn Study Chaos <br />
        Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Clarity</span>
      </h1>

      <p className="mt-5 text-gray-400 text-lg md:text-xl max-w-2xl mx-auto md:mx-0 leading-relaxed">
        Upload scattered PDFs, slides, and notes. ASTRA automatically organizes everything into structured, searchable intelligence using AI.
      </p>

      {/* Global Search Bar */}
      <div className="mt-10 relative max-w-xl mx-auto md:mx-0 z-30">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-purple-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search all your notes, topics, concepts..."
            className="w-full pl-12 pr-20 py-4 rounded-2xl bg-white/5 border border-white/15 outline-none focus:border-purple-500 focus:bg-white/10 transition-all duration-300 text-white placeholder-gray-500 shadow-2xl backdrop-blur-md"
          />

          <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setIsOpen(false);
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center text-[10px] text-gray-400 bg-white/10 border border-white/10 px-2 py-1 rounded-md font-mono">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {isOpen && query.trim().length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 mt-3 rounded-2xl bg-black/90 border border-purple-500/30 backdrop-blur-xl shadow-2xl overflow-hidden text-left z-40 max-h-[420px] overflow-y-auto"
            >
              {documents.length === 0 ? (
                <div className="p-6 text-center text-gray-400 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                  <p className="text-sm font-medium text-gray-300">No study material uploaded yet</p>
                  <p className="text-xs text-gray-500">Upload PDF documents below to enable instant search.</p>
                </div>
              ) : results.length === 0 ? (
                <div className="p-6 text-center text-gray-400 space-y-2">
                  <Search className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                  <p className="text-sm font-medium text-gray-300">No matches found</p>
                  <p className="text-xs text-gray-500">
                    No matching concepts found for &ldquo;<span className="text-purple-400">{query}</span>&rdquo; in your study notes.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  <div className="px-4 py-2 bg-white/5 flex items-center justify-between text-[11px] text-gray-400 uppercase tracking-wider font-mono">
                    <span>Search Results ({results.length})</span>
                    <span className="text-purple-400">Click to Open in Workspace</span>
                  </div>

                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className="w-full p-4 hover:bg-purple-600/15 transition-colors flex flex-col gap-1.5 text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-semibold uppercase tracking-wider border border-purple-500/30">
                            {result.subjectName}
                          </span>
                          <span className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {result.documentName}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1 group-hover:text-white transition-colors">
                          Page {result.page}
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed font-mono line-clamp-2">
                        {renderHighlightedSnippet(result.snippet, result.matchedTerms)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default HeroSection;

