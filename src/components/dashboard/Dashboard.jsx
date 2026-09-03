import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { studyHistoryService } from '../../services/studyHistoryService';
import { 
  calculateAverageQuizScore, 
  calculateBestQuizScore, 
  calculateLatestQuizScore, 
  calculateCompletedQuizzesCount,
  calculateStudyStreak,
  calculateSubjectProgress,
  getContinueStudyingTarget
} from '../../services/studyAnalyticsService';
import StatCard from './StatCard';
import SubjectProgressCard from './SubjectProgressCard';
import RecentActivityList from './RecentActivityList';
import BackupSection from './BackupSection';
import { 
  BookOpen, 
  Flame, 
  Trophy, 
  Layers, 
  ArrowRight, 
  Upload, 
  Sparkles
} from 'lucide-react';

const Dashboard = () => {
  const {
    documents,
    subjects,
    quizAttempts,
    flashcardDecks,
    flashcardStudyState,
    summaries,
    setSelectedSubject,
    setSelectedDocumentId,
    setActiveView
  } = useStore();

  const [activities, setActivities] = useState([]);

  const refreshActivities = () => {
    studyHistoryService.getRecentActivity(30).then((res) => {
      setActivities(res || []);
    });
  };

  useEffect(() => {
    refreshActivities();
  }, []);

  // Derived Real Calculations
  const stats = useMemo(() => {
    const totalSubjects = subjects.length;
    const totalDocs = documents.length;
    const completedQuizzes = calculateCompletedQuizzesCount(quizAttempts);
    const avgScore = calculateAverageQuizScore(quizAttempts);
    const bestScore = calculateBestQuizScore(quizAttempts);
    const latestScore = calculateLatestQuizScore(quizAttempts);
    const streak = calculateStudyStreak(activities);
    const totalFlashcards = Object.values(flashcardDecks || {}).reduce(
      (sum, deck) => sum + (deck.cards ? deck.cards.length : 0),
      0
    );

    const continueTarget = getContinueStudyingTarget({
      documents,
      subjects,
      studyHistory: activities
    });

    return {
      totalSubjects,
      totalDocs,
      completedQuizzes,
      avgScore,
      bestScore,
      latestScore,
      streak,
      totalFlashcards,
      continueTarget
    };
  }, [documents, subjects, quizAttempts, flashcardDecks, activities]);

  const handleOpenWorkspace = (subjectId, docId = null) => {
    setSelectedSubject(subjectId);
    if (docId) {
      setSelectedDocumentId(docId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8 pb-12"
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300 uppercase tracking-wider font-mono">
              Academic Overview
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Study Intelligence Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time analytics and progress across your local course material.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setActiveView('home')}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
          >
            Back to Notes
          </button>
        </div>
      </div>

      {/* Continue Studying Highlight Banner (if recent target exists) */}
      {stats.continueTarget && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 md:p-7 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black border border-purple-500/30 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 flex-shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-purple-300 mb-0.5">
                <span>Continue Studying</span>
                <span>•</span>
                <span className="text-gray-400">{stats.continueTarget.lastAction}</span>
              </div>
              <h3 className="text-xl font-bold text-white">
                {stats.continueTarget.subjectName}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {stats.continueTarget.documentName}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenWorkspace(stats.continueTarget.subjectId, stats.continueTarget.documentId)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 cursor-pointer flex-shrink-0"
          >
            <span>Resume Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          title="Course Materials"
          value={stats.totalDocs}
          subtitle={`${stats.totalSubjects} Subject${stats.totalSubjects === 1 ? '' : 's'}`}
          color="blue"
        />

        <StatCard
          icon={Flame}
          title="Daily Study Streak"
          value={stats.streak > 0 ? `${stats.streak} Day${stats.streak === 1 ? '' : 's'}` : '—'}
          subtitle={stats.streak > 0 ? 'Active study days' : 'No active streak'}
          color="amber"
        />

        <StatCard
          icon={Trophy}
          title="Practice Quizzes"
          value={stats.completedQuizzes}
          subtitle={stats.avgScore !== null ? `Average: ${stats.avgScore}%` : 'No attempts yet'}
          color="emerald"
        />

        <StatCard
          icon={Layers}
          title="Active Recall"
          value={stats.totalFlashcards}
          subtitle={`${Object.keys(flashcardDecks || {}).length} Active Deck${Object.keys(flashcardDecks || {}).length === 1 ? '' : 's'}`}
          color="pink"
        />
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Subject Progress */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Subject Overview ({subjects.length})
            </h3>
            {subjects.length > 0 && (
              <span className="text-xs text-gray-400 font-mono">
                Click a card to enter workspace
              </span>
            )}
          </div>

          {subjects.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Your study space is empty</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Upload your PDF notes or lecture slides to automatically organize subjects and track your progress.
                </p>
              </div>
              <button
                onClick={() => setActiveView('home')}
                className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-all inline-flex items-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Upload Study Material
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map((subj) => {
                const progressData = calculateSubjectProgress(subj, {
                  documents,
                  quizAttempts,
                  flashcardStudyState,
                  summaries
                });

                return (
                  <SubjectProgressCard
                    key={subj.id}
                    subject={subj}
                    progressData={progressData}
                    onSelect={(id) => handleOpenWorkspace(id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quiz Highlights & Activity Timeline */}
        <div className="space-y-6">
          {/* Quiz Performance Card */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Examination Metrics
              </h3>
            </div>

            {stats.completedQuizzes === 0 ? (
              <div className="py-6 text-center text-gray-500 space-y-1">
                <p className="text-xs font-medium text-gray-400">No quiz attempts yet</p>
                <p className="text-[11px] text-gray-500">
                  Take a practice quiz in any subject to test your recall.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-lg font-bold text-white font-mono">{stats.avgScore}%</p>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Average</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-lg font-bold text-emerald-400 font-mono">{stats.bestScore}%</p>
                  <p className="text-[10px] text-emerald-300 uppercase font-semibold">Highest</p>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-lg font-bold text-indigo-300 font-mono">{stats.latestScore}%</p>
                  <p className="text-[10px] text-indigo-200 uppercase font-semibold">Latest</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity Timeline */}
          <RecentActivityList activities={activities} />
        </div>
      </div>

      {/* Data & Backup Management Section */}
      <BackupSection onRefreshActivities={refreshActivities} />
    </motion.div>
  );
};

export default Dashboard;
