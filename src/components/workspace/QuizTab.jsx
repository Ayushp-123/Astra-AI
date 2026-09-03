import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { retrieveQuizContext } from '../../services/contextService';
import { generateQuiz, gradeQuiz } from '../../services/aiService';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { 
  Sparkles, 
  RotateCw, 
  AlertCircle, 
  FileText, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';

const QUIZ_SIZES = [5, 10, 15, 20];
const QUESTION_TYPES = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'mcq', label: 'MCQ' },
  { id: 'true_false', label: 'True / False' },
  { id: 'short_answer', label: 'Short Answer' }
];

const QuizTab = () => {
  const {
    getSelectedSubject,
    getDocumentsForSubject,
    selectedDocumentId,
    quizzes,
    setQuiz,
    quizLoading,
    quizLoadingScopes,
    setQuizLoading,
    quizError,
    setQuizError,
    quizAttempts,
    saveQuizAnswer,
    setQuizCurrentIndex,
    submitQuizAttempt,
    resetQuizAttempt,
    documents
  } = useStore();

  const [targetCount, setTargetCount] = useState(10);
  const [selectedType, setSelectedType] = useState('mixed');
  const [isConfiguring, setIsConfiguring] = useState(false);

  const selectedSubject = getSelectedSubject();
  const subjectDocs = selectedSubject ? getDocumentsForSubject(selectedSubject.id) : [];
  const activeDocs = selectedDocumentId 
    ? subjectDocs.filter(d => d.id === selectedDocumentId)
    : subjectDocs;

  const activeDoc = documents.find(d => d.id === selectedDocumentId);
  const scopeKey = selectedDocumentId 
    ? `doc_${selectedDocumentId}` 
    : `subj_${selectedSubject?.id || 'default'}`;

  const isScopeLoading = quizLoadingScopes ? !!quizLoadingScopes[scopeKey] : quizLoading;
  const currentQuiz = quizzes[scopeKey] || null;
  const currentAttempt = quizAttempts[scopeKey] || {
    currentIndex: 0,
    userAnswers: {},
    submitted: false,
    results: null
  };

  const currentIndex = currentAttempt.currentIndex || 0;
  const questions = currentQuiz?.questions || [];
  const currentQuestion = questions[currentIndex] || null;
  const userAnswers = currentAttempt.userAnswers || {};
  const isSubmitted = currentAttempt.submitted;
  const results = currentAttempt.results;

  const handleGenerateQuiz = async (count = targetCount, type = selectedType) => {
    if (isScopeLoading || activeDocs.length === 0) return;

    const requestScopeKey = scopeKey;
    setQuizLoading(true, requestScopeKey);
    setQuizError(null);
    setIsConfiguring(false);

    try {
      // 1. Retrieve representative context across active documents
      const contextResult = retrieveQuizContext(activeDocs, { maxChars: 9000 });

      // 2. Generate grounded quiz via AI
      const result = await generateQuiz(contextResult, {
        count,
        questionType: type,
        subjectName: selectedSubject?.name,
        docName: activeDocs.length === 1 ? activeDocs[0].name : undefined
      });

      if (result.error) {
        setQuizError(result.error);
      } else if (result.quiz && result.quiz.questions && result.quiz.questions.length > 0) {
        setQuiz(requestScopeKey, {
          ...result.quiz,
          sourceDocumentIds: activeDocs.map(d => d.id)
        });
      } else {
        setQuizError("Unable to generate valid quiz questions. Please try again.");
      }
    } catch (err) {
      console.error("Quiz generation error:", err);
      setQuizError("Failed to generate quiz. Please check your network and try again.");
    } finally {
      setQuizLoading(false, requestScopeKey);
    }
  };

  const handleAnswerSelect = (answer) => {
    if (!currentQuestion || isSubmitted) return;
    saveQuizAnswer(scopeKey, currentQuestion.id, answer);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setQuizCurrentIndex(scopeKey, currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setQuizCurrentIndex(scopeKey, currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (questions.length === 0) return;
    const gradedResults = gradeQuiz(questions, userAnswers);
    submitQuizAttempt(scopeKey, gradedResults);
  };

  const handleRetake = () => {
    resetQuizAttempt(scopeKey);
  };

  const headerTitle = activeDoc 
    ? activeDoc.name 
    : `All Notes for ${selectedSubject?.name || 'Subject'}`;

  const hasReadableContent = activeDocs.some(d => d.fullText && d.fullText.trim().length > 0);
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl relative">
      {/* Top Header */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5">
        <div className="flex items-center gap-3 overflow-hidden mr-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/20 flex-shrink-0">
            {activeDoc ? <FileText className="w-6 h-6 text-white" /> : <Layers className="w-6 h-6 text-white" />}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white truncate" title={headerTitle}>
                Practice Examination
              </h2>
              {currentQuiz && (
                <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  {questions.length} Questions
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{headerTitle}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {currentQuiz && !isConfiguring && (
            <button
              onClick={() => setIsConfiguring(true)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Configure New
            </button>
          )}

          {(!currentQuiz || isConfiguring) && (
            <button
              onClick={() => handleGenerateQuiz(targetCount, selectedType)}
              disabled={isScopeLoading || !hasReadableContent}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              {isScopeLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <RotateCw className="w-4 h-4" />
                </motion.div>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Generate Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
        {/* Error Alert */}
        {quizError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-300 text-sm mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold">Quiz Notice</p>
              <p className="text-xs text-red-300/90 mt-0.5">{quizError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isScopeLoading && (
          <div className="my-auto py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="text-indigo-400"
                >
                  <Sparkles className="w-7 h-7" />
                </motion.div>
              </div>
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Generating Practice Quiz</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Constructing rigorous multiple-choice, true/false, and short-answer questions from your notes...
              </p>
            </div>
          </div>
        )}

        {/* Configuration / Setup Screen */}
        {!isScopeLoading && (!currentQuiz || isConfiguring) && (
          <div className="my-auto max-w-md mx-auto w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Create Practice Quiz</h3>
              <p className="text-xs text-gray-400">
                Configure your practice test grounded strictly in your {selectedSubject?.name || 'course'} notes.
              </p>
            </div>

            {/* Size Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
                Number of Questions
              </label>
              <div className="grid grid-cols-4 gap-2">
                {QUIZ_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setTargetCount(size)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      targetCount === size
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/40'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
                Question Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer flex items-center justify-between ${
                      selectedType === type.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/40'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{type.label}</span>
                    {selectedType === type.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleGenerateQuiz(targetCount, selectedType)}
              disabled={!hasReadableContent}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Generate Practice Test
            </button>
          </div>
        )}

        {/* Results & In-Depth Review Screen */}
        {!isScopeLoading && currentQuiz && isSubmitted && results && (
          <div className="space-y-6">
            {/* Score Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 to-purple-950/30 border border-indigo-500/30 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Examination Complete</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Grounded evaluation for {currentQuiz.title || selectedSubject?.name}
                  </p>
                </div>
              </div>

              {/* Score Metric */}
              <div className="flex items-center gap-6">
                <div className="text-center md:text-right">
                  <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-mono">
                    {results.score} / {results.totalQuestions}
                  </p>
                  <p className="text-xs font-semibold text-indigo-300 font-mono">
                    {results.percentage}% Score
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetake}
                    className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                    Retake
                  </button>
                  <button
                    onClick={() => setIsConfiguring(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    New Test
                  </button>
                </div>
              </div>
            </div>

            {/* Performance Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-2xl font-bold text-emerald-400">{results.correctCount}</p>
                <p className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider">Correct</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-2xl font-bold text-amber-400">{results.partialCount}</p>
                <p className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider">Partial</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <p className="text-2xl font-bold text-rose-400">{results.incorrectCount}</p>
                <p className="text-[11px] text-rose-300 font-semibold uppercase tracking-wider">Incorrect</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-500/10 border border-gray-500/20 text-center">
                <p className="text-2xl font-bold text-gray-400">{results.unansweredCount}</p>
                <p className="text-[11px] text-gray-300 font-semibold uppercase tracking-wider">Unanswered</p>
              </div>
            </div>

            {/* Detailed Question Review List */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Detailed Review & Explanations ({results.results.length})
              </h4>

              <div className="space-y-3">
                {results.results.map((res, idx) => {
                  const isCorrect = res.status === 'correct';
                  const isPartial = res.status === 'partial';
                  const isUnanswered = res.status === 'unanswered';

                  return (
                    <div
                      key={res.questionId || idx}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCorrect
                          ? 'bg-emerald-950/15 border-emerald-500/30'
                          : isPartial
                          ? 'bg-amber-950/15 border-amber-500/30'
                          : isUnanswered
                          ? 'bg-gray-900/30 border-gray-700/40'
                          : 'bg-rose-950/15 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">
                            Q{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-gray-300">
                            {res.type}
                          </span>
                          {res.sourceReference && (
                            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-mono">
                              {res.sourceReference}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          {isCorrect && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Correct (+1)
                            </span>
                          )}
                          {isPartial && (
                            <span className="text-amber-400 flex items-center gap-1">
                              <HelpCircle className="w-4 h-4" /> Partial (+0.5)
                            </span>
                          )}
                          {!isCorrect && !isPartial && !isUnanswered && (
                            <span className="text-rose-400 flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Incorrect
                            </span>
                          )}
                          {isUnanswered && (
                            <span className="text-gray-400 flex items-center gap-1">
                              <Clock className="w-4 h-4" /> Unanswered
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-semibold text-white mb-3">
                        {res.question}
                      </p>

                      {/* Answers Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-gray-400 block mb-1 font-mono uppercase text-[10px]">Your Answer:</span>
                          <span className={isCorrect ? "text-emerald-300 font-medium" : "text-rose-300 font-medium"}>
                            {res.userAnswer !== undefined && res.userAnswer !== null && res.userAnswer !== ""
                              ? (res.type === 'mcq' ? (res.options ? res.options[Number(res.userAnswer)] : res.userAnswer) : String(res.userAnswer))
                              : "(No Answer Provided)"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-gray-400 block mb-1 font-mono uppercase text-[10px]">Correct Answer:</span>
                          <span className="text-emerald-300 font-medium">
                            {String(res.correctAnswer)}
                          </span>
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 leading-relaxed">
                        <strong className="text-indigo-300 block mb-1 font-mono uppercase text-[10px]">Explanation:</strong>
                        <MarkdownRenderer content={res.explanation} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active Quiz Taking Screen */}
        {!isScopeLoading && currentQuiz && !isSubmitted && !isConfiguring && currentQuestion && (
          <div className="flex flex-col flex-1 justify-between gap-6">
            {/* Top Info & Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                <span>
                  Question <strong className="text-white">{currentIndex + 1}</strong> of {questions.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold">
                    {currentQuestion.type}
                  </span>
                  <span className="capitalize text-gray-400">
                    Difficulty: {currentQuestion.difficulty || 'medium'}
                  </span>
                </div>
              </div>

              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-white/10 to-indigo-950/20 border border-indigo-500/30 backdrop-blur-md shadow-2xl space-y-6">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-indigo-400 font-mono">Question</p>
                <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Answer Choices */}
              <div className="space-y-2.5">
                {/* 1. MCQ Choices */}
                {currentQuestion.type === 'mcq' && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentQuestion.options?.map((option, optIdx) => {
                      const isSelected = userAnswers[currentQuestion.id] === optIdx;
                      const optLabel = String.fromCharCode(65 + optIdx);

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleAnswerSelect(optIdx)}
                          className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs font-mono flex-shrink-0 ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
                          }`}>
                            {optLabel}
                          </span>
                          <span className="text-sm font-medium leading-relaxed">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. True / False Choices */}
                {currentQuestion.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      onClick={() => handleAnswerSelect(true)}
                      className={`p-6 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                        userAnswers[currentQuestion.id] === true
                          ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <span className="text-base font-bold">True</span>
                    </button>

                    <button
                      onClick={() => handleAnswerSelect(false)}
                      className={`p-6 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                        userAnswers[currentQuestion.id] === false
                          ? 'bg-rose-600/30 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <XCircle className="w-8 h-8 text-rose-400" />
                      <span className="text-base font-bold">False</span>
                    </button>
                  </div>
                )}

                {/* 3. Short Answer Choice */}
                {currentQuestion.type === 'short_answer' && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={4}
                      value={userAnswers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerSelect(e.target.value)}
                      placeholder="Type your answer based on your study material..."
                      className="w-full p-4 rounded-2xl bg-black/40 border border-white/15 focus:border-indigo-500 focus:outline-none text-sm text-white placeholder-gray-500 transition-colors leading-relaxed resize-none"
                    />
                    <p className="text-[11px] text-gray-400">
                      Answer clearly using the key terms and concepts from your notes.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Question Quick Jump Bar */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {questions.map((q, idx) => {
                const isAnswered = userAnswers[q.id] !== undefined && userAnswers[q.id] !== null && userAnswers[q.id] !== "";
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setQuizCurrentIndex(scopeKey, idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center relative ${
                      isCurrent
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-black'
                        : isAnswered
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-white/5 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {idx + 1}
                    {isAnswered && !isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 absolute top-0.5 right-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium text-gray-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="text-xs text-gray-400 font-mono">
                Answered: <strong className="text-white">{answeredCount}</strong> / {questions.length}
              </div>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizTab;
