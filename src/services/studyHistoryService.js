import { storageService } from './storageService.js';

/**
 * Study History & Activity Tracking Service
 * 
 * Records structured student activity events (reading, summaries, flashcards, quizzes)
 * for personal progress tracking and local analytics.
 */

export const studyHistoryService = {
  /**
   * Log a document upload or opening event
   */
  async recordDocumentEvent(type, doc) {
    if (!doc) return;
    await storageService.recordStudyHistory({
      type: type || 'document_opened',
      subjectId: doc.subjectId,
      documentId: doc.id,
      title: `Studied: ${doc.name || 'Document'}`
    });
  },

  /**
   * Log a summary generation event
   */
  async recordSummaryEvent(scopeKey, subjectName, docName) {
    await storageService.recordStudyHistory({
      type: 'summary_generated',
      title: docName ? `Generated summary for ${docName}` : `Generated summary for ${subjectName || 'Subject'}`
    });
  },

  /**
   * Log a flashcard study completion event
   */
  async recordFlashcardCompletion(scopeKey, totalCards, easyCount) {
    await storageService.recordStudyHistory({
      type: 'flashcard_completed',
      title: `Completed ${totalCards} Flashcards (${easyCount} mastered)`
    });
  },

  /**
   * Log a quiz completion event
   */
  async recordQuizCompletion(scopeKey, quizTitle, score, totalQuestions, percentage) {
    await storageService.recordStudyHistory({
      type: 'quiz_completed',
      title: `Completed Quiz: ${quizTitle || 'Practice Exam'}`,
      score,
      percentage
    });
  },

  /**
   * Retrieve recent study events
   */
  async getRecentActivity(limit = 20) {
    return storageService.getStudyHistory(limit);
  }
};
