import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText, 
  FolderTree, 
  Sparkles, 
  Layers, 
  Trophy, 
  MessageSquare, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const ImportPreviewModal = ({
  isOpen,
  previewData,
  onClose,
  onConfirmRestore,
  isRestoring,
  restoreError,
  restoreSuccess
}) => {
  const [selectedMode, setSelectedMode] = useState('merge'); // 'merge' | 'replace'

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRestoring) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRestoring, onClose]);

  if (!isOpen || !previewData) return null;

  const formattedDate = previewData.exportedAt
    ? new Date(previewData.exportedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown date';

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl rounded-3xl bg-gradient-to-b from-[#16161f] to-[#0c0c12] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 id="import-preview-title" className="text-lg font-bold text-white">
                  ASTRA Backup Preview
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Created: {formattedDate} (v{previewData.version})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isRestoring}
              aria-label="Close modal"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Contents Overview Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                Backup Contents
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-white font-mono">{previewData.documentCount}</p>
                    <p className="text-[11px] text-gray-400">Documents</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <FolderTree className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-white font-mono">{previewData.subjectCount}</p>
                    <p className="text-[11px] text-gray-400">Subjects</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-white font-mono">{previewData.summaryCount}</p>
                    <p className="text-[11px] text-gray-400">Summaries</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <Layers className="w-5 h-5 text-pink-400 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-white font-mono">{previewData.totalFlashcards}</p>
                    <p className="text-[11px] text-gray-400">Flashcards</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-white font-mono">{previewData.quizCount}</p>
                    <p className="text-[11px] text-gray-400">Quizzes</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-teal-400 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-white font-mono">{previewData.quizAttemptCount}</p>
                    <p className="text-[11px] text-gray-400">Quiz Attempts</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-white font-mono">{previewData.chatMessageCount}</p>
                    <p className="text-[11px] text-gray-400">Chat Messages</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <History className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-white font-mono">{previewData.historyCount}</p>
                    <p className="text-[11px] text-gray-400">History Events</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Restore Strategy Mode Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                Choose Restore Mode
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Merge Mode Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('merge')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'merge'
                      ? 'bg-purple-600/15 border-purple-500/50 shadow-lg shadow-purple-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      Merge Data
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                        Recommended
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={selectedMode === 'merge'}
                      onChange={() => setSelectedMode('merge')}
                      className="accent-purple-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Combines incoming materials with your current workspace without overwriting existing files.
                  </p>
                </button>

                {/* Replace Mode Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('replace')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'replace'
                      ? 'bg-red-600/15 border-red-500/50 shadow-lg shadow-red-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">
                      Replace All Data
                    </span>
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={selectedMode === 'replace'}
                      onChange={() => setSelectedMode('replace')}
                      className="accent-red-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Wipes current local study data and restores the exact state from this backup file.
                  </p>
                </button>
              </div>

              {/* Caution banner for Replace mode */}
              {selectedMode === 'replace' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 flex items-start gap-3 text-red-200 text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-red-300">Warning:</span> Replace mode permanently removes any existing course notes, summaries, and test history currently in this browser before restoring.
                  </div>
                </motion.div>
              )}
            </div>

            {/* Error or Success Feedback */}
            {restoreError && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            {restoreSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Study environment restored successfully!</span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isRestoring}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirmRestore(selectedMode)}
              disabled={isRestoring || restoreSuccess}
              className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 ${
                selectedMode === 'replace'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/25'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/25'
              }`}
            >
              {isRestoring ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Restoring...</span>
                </>
              ) : restoreSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Restored</span>
                </>
              ) : (
                <>
                  <span>{selectedMode === 'replace' ? 'Confirm & Replace All' : 'Restore Backup'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ImportPreviewModal;
