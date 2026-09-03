/**
 * ASTRA AI Study Analytics & Progress Calculation Service
 * 
 * Pure, deterministic calculation functions derived strictly from real persisted
 * documents, subjects, quizzes, flashcards, and activity history.
 * No fake, placeholder, or fabricated numbers.
 */

/**
 * Calculate average quiz percentage from submitted attempts
 * 
 * @param {Object} quizAttempts - Map of scopeKey -> { submitted, results, ... }
 * @returns {number|null} Average percentage (0-100) or null if no attempts
 */
export function calculateAverageQuizScore(quizAttempts = {}) {
  const attempts = Object.values(quizAttempts || {}).filter(
    (a) => a && a.submitted && a.results && typeof a.results.percentage === 'number'
  );

  if (attempts.length === 0) return null;

  const total = attempts.reduce((sum, a) => sum + a.results.percentage, 0);
  return Math.round(total / attempts.length);
}

/**
 * Calculate highest/best quiz score from submitted attempts
 * 
 * @param {Object} quizAttempts 
 * @returns {number|null} Best percentage or null
 */
export function calculateBestQuizScore(quizAttempts = {}) {
  const attempts = Object.values(quizAttempts || {}).filter(
    (a) => a && a.submitted && a.results && typeof a.results.percentage === 'number'
  );

  if (attempts.length === 0) return null;

  return Math.max(...attempts.map((a) => a.results.percentage));
}

/**
 * Calculate latest submitted quiz score
 * 
 * @param {Object} quizAttempts 
 * @returns {number|null} Latest percentage or null
 */
export function calculateLatestQuizScore(quizAttempts = {}) {
  const attempts = Object.values(quizAttempts || {}).filter(
    (a) => a && a.submitted && a.results && typeof a.results.percentage === 'number'
  );

  if (attempts.length === 0) return null;
  return attempts[attempts.length - 1].results.percentage;
}

/**
 * Count total completed quizzes
 * 
 * @param {Object} quizAttempts 
 * @returns {number}
 */
export function calculateCompletedQuizzesCount(quizAttempts = {}) {
  return Object.values(quizAttempts || {}).filter(
    (a) => a && a.submitted && a.results
  ).length;
}

/**
 * Calculate consecutive daily study streak
 * 
 * A study day is defined as a calendar day containing at least one meaningful study event.
 * 
 * @param {Array<Object>} events - Array of study history events with ISO timestamp
 * @returns {number} Consecutive active days streak
 */
export function calculateStudyStreak(events = []) {
  if (!Array.isArray(events) || events.length === 0) return 0;

  // Extract unique YYYY-MM-DD dates in UTC/Local
  const dateSet = new Set();
  for (const event of events) {
    if (event && event.timestamp) {
      try {
        const d = new Date(event.timestamp);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toISOString().split('T')[0];
          dateSet.add(dateStr);
        }
      } catch {
        // Skip invalid timestamps
      }
    }
  }

  if (dateSet.size === 0) return 0;

  // Sort descending
  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // If latest activity was not today or yesterday, streak is broken
  const latestDate = sortedDates[0];
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let expectedDate = new Date(latestDate);

  for (const dateStr of sortedDates) {
    const expectedStr = expectedDate.toISOString().split('T')[0];
    if (dateStr === expectedStr) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate subject study progress and status
 * 
 * @param {Object} subject 
 * @param {Object} context - { documents, quizAttempts, flashcardStudyState, summaries }
 * @returns {Object} { status: string, progress: number|null, label: string, docCount: number, quizScore: number|null }
 */
export function calculateSubjectProgress(subject, context = {}) {
  if (!subject) {
    return { status: 'Not Started', progress: null, label: 'Not started', docCount: 0, quizScore: null };
  }

  const { documents = [], quizAttempts = {}, flashcardStudyState = {}, summaries = {} } = context;
  const subjectDocs = documents.filter((d) => (subject.documentIds || []).includes(d.id));
  const docCount = subjectDocs.length;

  if (docCount === 0) {
    return { status: 'Not Started', progress: null, label: 'No documents', docCount: 0, quizScore: null };
  }

  // Check subject-level and doc-level artifacts
  const subjScope = `subj_${subject.id}`;
  const docScopes = subjectDocs.map((d) => `doc_${d.id}`);
  const allScopes = [subjScope, ...docScopes];

  // 1. Quizzes
  const relevantAttempts = allScopes
    .map((s) => quizAttempts[s])
    .filter((a) => a && a.submitted && a.results && typeof a.results.percentage === 'number');

  const quizScore = relevantAttempts.length > 0
    ? Math.round(relevantAttempts.reduce((sum, a) => sum + a.results.percentage, 0) / relevantAttempts.length)
    : null;

  // 2. Flashcards
  let totalCardsReviewed = 0;
  let easyCardsCount = 0;

  for (const scope of allScopes) {
    const study = flashcardStudyState[scope];
    if (study && study.ratings) {
      const ratings = Object.values(study.ratings);
      totalCardsReviewed += ratings.length;
      easyCardsCount += ratings.filter((r) => r === 'easy').length;
    }
  }

  const flashcardMastery = totalCardsReviewed > 0
    ? Math.round((easyCardsCount / totalCardsReviewed) * 100)
    : null;

  // 3. Summaries
  const hasSummary = allScopes.some((s) => summaries[s] !== undefined);

  // If only documents exist with no quiz/flashcard activity
  if (quizScore === null && flashcardMastery === null) {
    if (hasSummary) {
      return {
        status: 'In Progress',
        progress: null,
        label: 'Summary Reviewed',
        docCount,
        quizScore: null
      };
    }
    return {
      status: 'In Progress',
      progress: null,
      label: 'Notes Extracted',
      docCount,
      quizScore: null
    };
  }

  // If real test or flashcard data exists, calculate weighted progress
  const progress = (quizScore !== null && flashcardMastery !== null)
    ? Math.round(quizScore * 0.7 + flashcardMastery * 0.3)
    : quizScore !== null
    ? quizScore
    : flashcardMastery;

  const status = progress >= 80 ? 'Strong' : progress >= 50 ? 'Practicing' : 'In Progress';

  return {
    status,
    progress,
    label: `${progress}% Study Progress`,
    docCount,
    quizScore
  };
}

/**
 * Determine the most relevant "Continue Studying" workspace target
 * 
 * @param {Object} params - { documents, subjects, studyHistory }
 * @returns {Object|null} { subjectId, subjectName, documentId, documentName, lastAction }
 */
export function getContinueStudyingTarget({ documents = [], subjects = [], studyHistory = [] }) {
  if (documents.length === 0 || subjects.length === 0) {
    return null;
  }

  // 1. Try finding latest activity event with valid document or subject
  if (Array.isArray(studyHistory) && studyHistory.length > 0) {
    for (const event of studyHistory) {
      if (event.documentId) {
        const doc = documents.find((d) => d.id === event.documentId);
        if (doc) {
          const subj = subjects.find((s) => s.id === doc.subjectId);
          return {
            subjectId: doc.subjectId,
            subjectName: doc.subjectName || subj?.name || 'Subject',
            documentId: doc.id,
            documentName: doc.name,
            lastAction: event.title || 'Recent Activity'
          };
        }
      }
      if (event.subjectId) {
        const subj = subjects.find((s) => s.id === event.subjectId);
        if (subj && subj.documentIds && subj.documentIds.length > 0) {
          const firstDoc = documents.find((d) => d.id === subj.documentIds[0]);
          return {
            subjectId: subj.id,
            subjectName: subj.name,
            documentId: firstDoc?.id || null,
            documentName: firstDoc?.name || 'All Notes',
            lastAction: event.title || 'Recent Activity'
          };
        }
      }
    }
  }

  // 2. Fallback to latest uploaded document
  const sortedDocs = [...documents].sort(
    (a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
  );

  const latestDoc = sortedDocs[0];
  if (latestDoc) {
    return {
      subjectId: latestDoc.subjectId,
      subjectName: latestDoc.subjectName || 'Subject',
      documentId: latestDoc.id,
      documentName: latestDoc.name,
      lastAction: 'Uploaded Document'
    };
  }

  return null;
}
