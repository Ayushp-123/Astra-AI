import test from 'node:test';
import assert from 'node:assert/strict';

import { extractKeywords, retrieveRelevantContext } from '../src/services/contextService.js';
import {
  parseSummaryResponse,
  parseFlashcardsResponse,
  parseQuizResponse,
  gradeQuiz
} from '../src/services/aiService.js';
import { buildSearchUnits, searchStudyMaterial, extractSnippet } from '../src/services/searchService.js';
import {
  calculateAverageQuizScore,
  calculateBestQuizScore,
  calculateCompletedQuizzesCount,
  calculateStudyStreak,
  calculateSubjectProgress,
  getContinueStudyingTarget
} from '../src/services/studyAnalyticsService.js';
import { studyHistoryService } from '../src/services/studyHistoryService.js';

test('ASTRA AI Phases 1B through 8 Regression Test Suite', async (t) => {

  // =========================================================================
  // Phase 1B: Multi-document and Subject Data Foundation
  // =========================================================================
  await t.test('Phase 1B — Document and chunk data modeling', () => {
    const documents = [
      {
        id: "doc-1",
        name: "Linear Algebra Ch1.pdf",
        subjectId: "math-101",
        subjectName: "Linear Algebra",
        chunks: [
          { page: 1, text: "A vector space is a set of vectors closed under addition and scalar multiplication." },
          { page: 2, text: "The determinant of a 2x2 matrix [a b; c d] is ad - bc." }
        ]
      },
      {
        id: "doc-2",
        name: "Linear Algebra Ch2.pdf",
        subjectId: "math-101",
        subjectName: "Linear Algebra",
        fullText: "Eigenvalues satisfy the characteristic equation det(A - lambda I) = 0."
      }
    ];

    assert.equal(documents.length, 2);
    assert.equal(documents[0].chunks.length, 2);
    assert.equal(documents[0].chunks[0].page, 1);
    assert.ok(documents[1].fullText.includes("Eigenvalues"));
  });

  // =========================================================================
  // Phase 2: Grounded AI Retrieval & Context Selection
  // =========================================================================
  await t.test('Phase 2 — Keyword extraction and relevance ranking', () => {
    const query = "What is the formula for matrix determinant?";
    const keywords = extractKeywords(query);

    assert.ok(keywords.includes("matrix"));
    assert.ok(keywords.includes("determinant"));
    assert.ok(keywords.includes("formula"));
    assert.ok(!keywords.includes("what")); // Stopword removed

    const documents = [
      {
        id: "doc-1",
        name: "Linear Algebra Ch1.pdf",
        subjectName: "Linear Algebra",
        chunks: [
          { page: 1, text: "A vector space is a collection of vectors." },
          { page: 2, text: "The determinant of a 2x2 matrix [a b; c d] is ad - bc." }
        ]
      }
    ];

    const context = retrieveRelevantContext(query, documents);
    assert.equal(context.hasReadableNotes, true);
    assert.equal(context.hasMatchingKeywords, true);
    assert.ok(context.contextText.includes("ad - bc"));
  });

  // =========================================================================
  // Phase 3: Summaries & Structured AI Parsing
  // =========================================================================
  await t.test('Phase 3 — JSON extraction and summary schema validation', () => {
    const rawAiOutput = `
Here is your study summary:
\`\`\`json
{
  "shortSummary": "Linear algebra fundamentals.",
  "keyConcepts": ["Vector Spaces", "Determinants", "Eigenvalues"],
  "importantDefinitions": [
    { "term": "Vector Space", "definition": "Set closed under addition and scalar multiplication." }
  ],
  "importantPoints": ["Determinant determines invertibility."],
  "examPoints": ["det(AB) = det(A)det(B)"]
}
\`\`\`
    `;

    const parsed = parseSummaryResponse(rawAiOutput);
    assert.equal(parsed.shortSummary, "Linear algebra fundamentals.");
    assert.equal(parsed.keyConcepts.length, 3);
    assert.equal(parsed.importantDefinitions[0].term, "Vector Space");
    assert.equal(parsed.examPoints[0], "det(AB) = det(A)det(B)");
  });

  // =========================================================================
  // Phase 4: Intelligent Study Search
  // =========================================================================
  await t.test('Phase 4 — Search units building and fuzzy document search', () => {
    const documents = [
      {
        id: "doc-1",
        name: "Physics Mechanics.pdf",
        subjectId: "phys",
        subjectName: "Physics",
        chunks: [
          { page: 1, text: "Newton's second law is F = ma in classical mechanics." },
          { page: 2, text: "Kinetic energy is calculated as 0.5 * m * v^2." }
        ]
      }
    ];

    const units = buildSearchUnits(documents);
    assert.equal(units.length, 2);
    assert.equal(units[0].page, 1);
    assert.ok(units[0].text.includes("F = ma"));

    const snippet = extractSnippet("Newton's second law is F = ma in dynamics.", "Newton");
    assert.ok(snippet.includes("Newton"));

    const searchResults = searchStudyMaterial("Newton", documents);
    assert.ok(searchResults.length > 0);
    assert.ok(searchResults[0].documentName.includes("Physics"));
  });

  // =========================================================================
  // Phase 5: AI Flashcards + Active Recall
  // =========================================================================
  await t.test('Phase 5 — Flashcard parsing and normalization', () => {
    const rawAi = JSON.stringify({
      title: "Physics Mechanics Flashcards",
      cards: [
        {
          question: "What is Newton's Second Law?",
          answer: "Force equals mass times acceleration (F=ma).",
          difficulty: "easy",
          keyConcept: "Dynamics"
        },
        {
          question: "What is work-energy theorem?",
          answer: "Net work done equals change in kinetic energy.",
          difficulty: "medium",
          keyConcept: "Energy"
        }
      ]
    });

    const parsed = parseFlashcardsResponse(rawAi);
    assert.equal(parsed.title, "Physics Mechanics Flashcards");
    assert.equal(parsed.cards.length, 2);
    assert.equal(parsed.cards[0].difficulty, "easy");
    assert.equal(parsed.cards[1].difficulty, "medium");
  });

  // =========================================================================
  // Phase 6: AI Practice Quizzes & Local Grading Engine
  // =========================================================================
  await t.test('Phase 6 — Quiz generation, parsing and local grading', () => {
    const rawAi = JSON.stringify({
      title: "Physics Exam",
      questions: [
        {
          id: "q_1",
          type: "mcq",
          question: "What is the unit of Force in SI?",
          options: ["Joule", "Newton", "Watt", "Pascal"],
          correctAnswer: 1,
          explanation: "Force is measured in Newtons (kg*m/s^2)."
        },
        {
          id: "q_2",
          type: "true_false",
          question: "Energy can be created from nothing in classical mechanics.",
          correctAnswer: false,
          explanation: "Conservation of energy prevents creation from nothing."
        },
        {
          id: "q_3",
          type: "short_answer",
          question: "State Newton's First Law.",
          expectedAnswer: "An object remains at rest or in uniform motion unless acted upon by a net force.",
          keyPoints: ["remains at rest", "uniform motion", "net force"],
          explanation: "Law of inertia."
        }
      ]
    });

    const parsed = parseQuizResponse(rawAi);
    assert.equal(parsed.questions.length, 3);

    // Test grading: 3 correct answers
    const grading = gradeQuiz(parsed.questions, {
      "q_1": 1, // Correct MCQ
      "q_2": false, // Correct T/F
      "q_3": "An object remains at rest or in uniform motion unless acted upon by a net force." // Correct Short Answer
    });

    assert.equal(grading.correctCount, 3);
    assert.equal(grading.score, 3);
    assert.equal(grading.percentage, 100);
  });

  // =========================================================================
  // Phase 7: IndexedDB Persistence & Study History
  // =========================================================================
  await t.test('Phase 7 — Study history service methods definition', () => {
    assert.equal(typeof studyHistoryService.recordDocumentEvent, 'function');
    assert.equal(typeof studyHistoryService.recordSummaryEvent, 'function');
    assert.equal(typeof studyHistoryService.recordFlashcardCompletion, 'function');
    assert.equal(typeof studyHistoryService.recordQuizCompletion, 'function');
    assert.equal(typeof studyHistoryService.getRecentActivity, 'function');
  });

  // =========================================================================
  // Phase 8: Student Dashboard + Study Insights
  // =========================================================================
  await t.test('Phase 8 — Pure deterministic study analytics calculation', () => {
    const mockQuizAttempts = {
      "attempt_1": {
        submitted: true,
        results: { percentage: 90, score: 9, totalQuestions: 10 }
      },
      "attempt_2": {
        submitted: true,
        results: { percentage: 80, score: 8, totalQuestions: 10 }
      }
    };

    const avgScore = calculateAverageQuizScore(mockQuizAttempts);
    assert.equal(avgScore, 85);

    const bestScore = calculateBestQuizScore(mockQuizAttempts);
    assert.equal(bestScore, 90);

    const completedQuizzes = calculateCompletedQuizzesCount(mockQuizAttempts);
    assert.equal(completedQuizzes, 2);

    const mockSubject = {
      id: "sub-1",
      name: "Biology",
      color: "emerald",
      documentIds: ["d1"]
    };

    const mockDocs = [
      { id: "d1", subjectId: "sub-1", name: "Bio.pdf" }
    ];

    const progress = calculateSubjectProgress(mockSubject, {
      documents: mockDocs,
      quizAttempts: {
        "doc_d1": {
          submitted: true,
          results: { percentage: 85 }
        }
      }
    });

    assert.equal(progress.docCount, 1);
    assert.equal(progress.status, 'Strong');
    assert.equal(progress.progress, 85);

    const todayIso = new Date().toISOString();
    const streak = calculateStudyStreak([{ timestamp: todayIso }]);
    assert.equal(streak, 1);

    const target = getContinueStudyingTarget({
      documents: mockDocs,
      subjects: [mockSubject],
      studyHistory: [{ documentId: "d1", title: "Studied Bio" }]
    });
    assert.equal(target.documentId, "d1");
    assert.equal(target.documentName, "Bio.pdf");
  });

});
