import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { retrieveSummaryContext } from '../../services/contextService';
import { generateSummary } from '../../services/aiService';
import { 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Lightbulb, 
  ListChecks, 
  RotateCw, 
  AlertCircle,
  Layers,
  FileText
} from 'lucide-react';

const SummaryTab = () => {
  const {
    getSelectedSubject,
    getDocumentsForSubject,
    selectedDocumentId,
    summaries,
    setSummary,
    summaryLoading,
    summaryLoadingScopes,
    setSummaryLoading,
    summaryError,
    setSummaryError,
    documents
  } = useStore();

  const selectedSubject = getSelectedSubject();
  const subjectDocs = selectedSubject ? getDocumentsForSubject(selectedSubject.id) : [];
  const activeDocs = selectedDocumentId 
    ? subjectDocs.filter(d => d.id === selectedDocumentId)
    : subjectDocs;

  const activeDoc = documents.find(d => d.id === selectedDocumentId);
  const scopeKey = selectedDocumentId 
    ? `doc_${selectedDocumentId}` 
    : `subj_${selectedSubject?.id || 'default'}`;

  const isScopeLoading = summaryLoadingScopes ? !!summaryLoadingScopes[scopeKey] : summaryLoading;
  const currentSummary = summaries[scopeKey] || null;

  const handleGenerateSummary = async () => {
    if (isScopeLoading || activeDocs.length === 0) return;

    const requestScopeKey = scopeKey;
    setSummaryLoading(true, requestScopeKey);
    setSummaryError(null);

    try {
      // 1. Retrieve representative summary context from active document(s)
      const contextResult = retrieveSummaryContext(activeDocs, { maxChars: 8000 });

      // 2. Generate structured academic summary
      const result = await generateSummary(contextResult, {
        subjectName: selectedSubject?.name,
        docName: activeDocs.length === 1 ? activeDocs[0].name : undefined
      });

      if (result.error) {
        setSummaryError(result.error);
      } else if (result.summary) {
        setSummary(requestScopeKey, result.summary);
      }
    } catch (err) {
      console.error("Summary generation error:", err);
      setSummaryError("Failed to generate summary. Please check your network and try again.");
    } finally {
      setSummaryLoading(false, requestScopeKey);
    }
  };

  const headerTitle = activeDoc 
    ? activeDoc.name 
    : `All Notes for ${selectedSubject?.name || 'Subject'}`;

  const hasReadableContent = activeDocs.some(d => d.fullText && d.fullText.trim().length > 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl relative">
      {/* Top Header */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5">
        <div className="flex items-center gap-3 overflow-hidden mr-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20 flex-shrink-0">
            {activeDoc ? <FileText className="w-6 h-6 text-white" /> : <Layers className="w-6 h-6 text-white" />}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white truncate" title={headerTitle}>
                Study Summary
              </h2>
              <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                AI Structured
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{headerTitle}</p>
          </div>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={isScopeLoading || !hasReadableContent}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 flex-shrink-0 cursor-pointer"
        >
          {isScopeLoading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <RotateCw className="w-4 h-4" />
            </motion.div>
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{currentSummary ? "Regenerate" : "Generate Summary"}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Error Alert */}
        {summaryError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold">Summary Generation Notice</p>
              <p className="text-xs text-red-300/90 mt-0.5">{summaryError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isScopeLoading && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="text-purple-400"
                >
                  <Sparkles className="w-7 h-7" />
                </motion.div>
              </div>
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Synthesizing Course Material</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Extracting core concepts, definitions, and high-yield exam takeaways from {activeDocs.length} {activeDocs.length === 1 ? 'document' : 'documents'}...
              </p>
            </div>
          </div>
        )}

        {/* Empty State (Not generated yet) */}
        {!isScopeLoading && !currentSummary && (
          <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center px-4 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 shadow-inner">
              <BookOpen className="w-8 h-8 opacity-60" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">High-Yield Revision Summary</h3>
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                Generate an executive overview, core concepts, essential definitions, and exam points synthesized directly from your study material.
              </p>
            </div>
            <button
              onClick={handleGenerateSummary}
              disabled={!hasReadableContent}
              className="mt-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Generate Study Summary
            </button>
          </div>
        )}

        {/* Rendered Summary Content */}
        {!isScopeLoading && currentSummary && (
          <div className="space-y-6">
            {/* 1. Short Overview */}
            {currentSummary.shortSummary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/30 to-blue-900/20 border border-purple-500/30 backdrop-blur-sm shadow-lg relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2 text-purple-300 font-semibold text-sm">
                  <Lightbulb className="w-4 h-4" />
                  <span>Executive Overview</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {currentSummary.shortSummary}
                </p>
              </motion.div>
            )}

            {/* 2. Key Concepts */}
            {Array.isArray(currentSummary.keyConcepts) && currentSummary.keyConcepts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-lg space-y-3"
              >
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Core Concepts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentSummary.keyConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-medium"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 3. Important Definitions */}
            {Array.isArray(currentSummary.importantDefinitions) && currentSummary.importantDefinitions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-lg space-y-3"
              >
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Important Definitions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentSummary.importantDefinitions.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1 hover:border-purple-500/30 transition-colors"
                    >
                      <h4 className="text-xs font-bold text-purple-400">{item.term}</h4>
                      <p className="text-xs text-gray-300 leading-relaxed">{item.definition}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. Important Points */}
            {Array.isArray(currentSummary.importantPoints) && currentSummary.importantPoints.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-lg space-y-3"
              >
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-emerald-400" />
                  Key Takeaways
                </h3>
                <ul className="space-y-2">
                  {currentSummary.importantPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                      <span className="text-emerald-400 font-bold mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* 5. Exam-Oriented Points */}
            {Array.isArray(currentSummary.examPoints) && currentSummary.examPoints.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/20 to-purple-950/20 border border-amber-500/30 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    High-Yield Exam Focus
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-mono">
                    Revision Focus
                  </span>
                </div>
                <ul className="space-y-2">
                  {currentSummary.examPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-amber-100/90 leading-relaxed">
                      <span className="text-amber-400 font-bold mt-0.5">★</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryTab;
