import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { retrieveFlashcardsContext } from '../../services/contextService';
import { generateFlashcards } from '../../services/aiService';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { 
  Sparkles, 
  RotateCw, 
  AlertCircle, 
  Layers, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  Trophy, 
  CheckCircle2
} from 'lucide-react';

const CARD_COUNTS = [5, 10, 15, 20];

const FlashcardsTab = () => {
  const {
    getSelectedSubject,
    getDocumentsForSubject,
    selectedDocumentId,
    flashcardDecks,
    setFlashcardDeck,
    flashcardLoading,
    flashcardLoadingScopes,
    setFlashcardLoading,
    flashcardError,
    setFlashcardError,
    flashcardStudyState,
    updateCardRating,
    setCardIndex,
    resetDeckStudyState,
    documents
  } = useStore();

  const [targetCount, setTargetCount] = useState(10);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const selectedSubject = getSelectedSubject();
  const subjectDocs = selectedSubject ? getDocumentsForSubject(selectedSubject.id) : [];
  const activeDocs = selectedDocumentId 
    ? subjectDocs.filter(d => d.id === selectedDocumentId)
    : subjectDocs;

  const activeDoc = documents.find(d => d.id === selectedDocumentId);
  const scopeKey = selectedDocumentId 
    ? `doc_${selectedDocumentId}` 
    : `subj_${selectedSubject?.id || 'default'}`;

  const isScopeLoading = flashcardLoadingScopes ? !!flashcardLoadingScopes[scopeKey] : flashcardLoading;
  const currentDeck = flashcardDecks[scopeKey] || null;
  const currentStudy = flashcardStudyState[scopeKey] || { currentIndex: 0, ratings: {} };
  const currentIndex = currentStudy.currentIndex || 0;

  const cards = currentDeck?.cards || [];
  const currentCard = cards[currentIndex] || null;
  const isDeckComplete = cards.length > 0 && currentIndex >= cards.length;

  const handleGenerateDeck = async (count = targetCount) => {
    if (isScopeLoading || activeDocs.length === 0) return;

    const requestScopeKey = scopeKey;
    setFlashcardLoading(true, requestScopeKey);
    setFlashcardError(null);
    setIsFlipped(false);
    setShowHint(false);

    try {
      // 1. Retrieve representative flashcard context from active documents
      const contextResult = retrieveFlashcardsContext(activeDocs, { maxChars: 8500 });

      // 2. Generate grounded flashcard deck via AI
      const result = await generateFlashcards(contextResult, {
        count,
        subjectName: selectedSubject?.name,
        docName: activeDocs.length === 1 ? activeDocs[0].name : undefined
      });

      if (result.error) {
        setFlashcardError(result.error);
      } else if (result.cards && result.cards.length > 0) {
        setFlashcardDeck(requestScopeKey, {
          cards: result.cards,
          count: result.cards.length,
          sourceDocumentIds: activeDocs.map(d => d.id)
        });
      } else {
        setFlashcardError("Unable to generate valid flashcards. Please try again.");
      }
    } catch (err) {
      console.error("Flashcard generation error:", err);
      setFlashcardError("Failed to generate flashcards. Please check your network and try again.");
    } finally {
      setFlashcardLoading(false, requestScopeKey);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setShowHint(false);
    if (currentIndex < cards.length) {
      setCardIndex(scopeKey, currentIndex + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowHint(false);
    if (currentIndex > 0) {
      setCardIndex(scopeKey, currentIndex - 1);
    }
  };

  const handleRating = (rating) => {
    updateCardRating(scopeKey, currentIndex, rating);
    // Auto advance after rating with brief delay
    setTimeout(() => {
      handleNext();
    }, 250);
  };

  const handleRestart = () => {
    setIsFlipped(false);
    setShowHint(false);
    resetDeckStudyState(scopeKey);
  };

  const headerTitle = activeDoc 
    ? activeDoc.name 
    : `All Notes for ${selectedSubject?.name || 'Subject'}`;

  const hasReadableContent = activeDocs.some(d => d.fullText && d.fullText.trim().length > 0);

  // Ratings calculation
  const ratingEntries = Object.values(currentStudy.ratings || {});
  const easyCount = ratingEntries.filter(r => r === 'easy').length;
  const mediumCount = ratingEntries.filter(r => r === 'medium').length;
  const hardCount = ratingEntries.filter(r => r === 'hard').length;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl relative">
      {/* Top Header */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5">
        <div className="flex items-center gap-3 overflow-hidden mr-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/20 flex-shrink-0">
            {activeDoc ? <FileText className="w-6 h-6 text-white" /> : <Layers className="w-6 h-6 text-white" />}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white truncate" title={headerTitle}>
                Active Recall Flashcards
              </h2>
              {cards.length > 0 && (
                <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  {cards.length} Cards
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{headerTitle}</p>
          </div>
        </div>

        {/* Count Selector & Generate Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
            {CARD_COUNTS.map((cnt) => (
              <button
                key={cnt}
                onClick={() => setTargetCount(cnt)}
                disabled={isScopeLoading}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  targetCount === cnt
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleGenerateDeck(targetCount)}
            disabled={isScopeLoading || !hasReadableContent}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 flex-shrink-0 cursor-pointer"
          >
            {isScopeLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <RotateCw className="w-4 h-4" />
              </motion.div>
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{currentDeck ? "Regenerate" : "Generate Deck"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
        {/* Error Alert */}
        {flashcardError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-300 text-sm mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold">Flashcard Generation Notice</p>
              <p className="text-xs text-red-300/90 mt-0.5">{flashcardError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isScopeLoading && (
          <div className="my-auto py-16 flex flex-col items-center justify-center text-center space-y-4">
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
              <h3 className="text-lg font-bold text-white">Generating {targetCount} Flashcards</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Extracting definitions, core concepts, comparisons, and formulas from your study notes...
              </p>
            </div>
          </div>
        )}

        {/* Empty State (Not generated yet) */}
        {!isScopeLoading && !currentDeck && (
          <div className="my-auto min-h-[350px] flex flex-col items-center justify-center text-center px-4 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 shadow-inner">
              <Layers className="w-8 h-8 opacity-60" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Active Recall Study Deck</h3>
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                Generate tailored question-and-answer flashcards based strictly on your uploaded {selectedSubject?.name || 'course'} notes.
              </p>
            </div>
            <button
              onClick={() => handleGenerateDeck(targetCount)}
              disabled={!hasReadableContent}
              className="mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Generate {targetCount} Flashcards
            </button>
          </div>
        )}

        {/* Deck Completed Screen */}
        {!isScopeLoading && currentDeck && isDeckComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-auto py-8 px-6 text-center max-w-md mx-auto rounded-3xl bg-white/5 border border-purple-500/30 backdrop-blur-md shadow-2xl space-y-5"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/20 to-purple-600/20 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white">Deck Completed!</h3>
              <p className="text-xs text-gray-400 mt-1">
                You reviewed all {cards.length} flashcards in this deck.
              </p>
            </div>

            {/* Ratings Summary Breakdown */}
            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xl font-bold text-emerald-400">{easyCount}</p>
                <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Easy</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-xl font-bold text-amber-400">{mediumCount}</p>
                <p className="text-[10px] text-amber-300 uppercase tracking-wider font-semibold">Medium</p>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-xl font-bold text-rose-400">{hardCount}</p>
                <p className="text-[10px] text-rose-300 uppercase tracking-wider font-semibold">Hard</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRestart}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                Study Again
              </button>
              <button
                onClick={() => handleGenerateDeck(targetCount)}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                New Deck
              </button>
            </div>
          </motion.div>
        )}

        {/* Active Flashcard Interaction View */}
        {!flashcardLoading && currentDeck && !isDeckComplete && currentCard && (
          <div className="flex flex-col flex-1 justify-between gap-6">
            {/* Progress Top Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                <span>
                  Card <strong className="text-white">{currentIndex + 1}</strong> of {cards.length}
                </span>
                <span className="capitalize text-purple-300">
                  {currentCard.type || 'Concept'}
                </span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* 3D Flip Card Container */}
            <div className="flex-1 min-h-[300px] flex items-center justify-center">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full h-full min-h-[280px] cursor-pointer relative select-none"
                style={{ perspective: "1200px" }}
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="w-full h-full min-h-[280px] relative rounded-3xl"
                >
                  {/* FRONT FACE (Question) */}
                  <div
                    style={{ backfaceVisibility: "hidden" }}
                    className="absolute inset-0 p-8 rounded-3xl bg-gradient-to-br from-white/10 to-purple-900/20 border border-purple-500/30 backdrop-blur-md shadow-2xl flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] uppercase font-bold tracking-wider">
                        {currentCard.type || 'Concept'}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                        Difficulty: <span className="text-purple-300">{currentCard.difficulty || 'medium'}</span>
                      </span>
                    </div>

                    <div className="my-auto py-4">
                      <p className="text-xs uppercase tracking-wider text-purple-400 font-mono mb-2">Question</p>
                      <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                        {currentCard.question}
                      </h3>
                    </div>

                    <div className="flex items-center justify-center text-xs text-gray-400 gap-1.5 pt-2 border-t border-white/5">
                      <RotateCw className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
                      <span>Click to flip card & reveal answer</span>
                    </div>
                  </div>

                  {/* BACK FACE (Answer) */}
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)"
                    }}
                    className="absolute inset-0 p-8 rounded-3xl bg-gradient-to-br from-purple-950/40 to-indigo-950/30 border border-purple-500/40 backdrop-blur-md shadow-2xl flex flex-col justify-between overflow-y-auto"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Answer
                      </span>

                      {currentCard.hint && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHint(!showHint);
                          }}
                          className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{showHint ? "Hide Hint" : "Hint"}</span>
                        </button>
                      )}
                    </div>

                    <div className="my-auto py-3">
                      <div className="text-sm md:text-base text-gray-100 leading-relaxed">
                        <MarkdownRenderer content={currentCard.answer} />
                      </div>

                      {showHint && currentCard.hint && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200"
                        >
                          <strong>Hint:</strong> {currentCard.hint}
                        </motion.div>
                      )}
                    </div>

                    {/* Self-Rating / Recall Grading Bar */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-3 border-t border-white/10 flex flex-col items-center gap-2"
                    >
                      <p className="text-[11px] text-gray-400">Rate your recall confidence:</p>
                      <div className="flex items-center gap-2 w-full max-w-xs">
                        <button
                          onClick={() => handleRating('hard')}
                          className="flex-1 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Hard
                        </button>
                        <button
                          onClick={() => handleRating('medium')}
                          className="flex-1 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Medium
                        </button>
                        <button
                          onClick={() => handleRating('easy')}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Easy
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium text-gray-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={handleRestart}
                className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1 cursor-pointer"
                title="Restart deck"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Restart
              </button>

              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-medium text-white transition-all flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardsTab;
