import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  exportBackup,
  parseBackupJson,
  validateBackup,
  previewBackup,
  restoreBackup
} from '../src/services/backupService.js';
import { searchStudyMaterial, resetSearchIndexCache } from '../src/services/searchService.js';
import {
  calculateAverageQuizScore,
  calculateCompletedQuizzesCount
} from '../src/services/studyAnalyticsService.js';

/**
 * Creates an in-memory mock storage object mirroring storageService
 */
function createMockStorage(initialState = {}) {
  const store = {
    documents: new Map((initialState.documents || []).map(d => [d.id, d])),
    subjects: new Map((initialState.subjects || []).map(s => [s.id, s])),
    summaries: new Map(Object.entries(initialState.summaries || {})),
    flashcards: new Map(Object.entries(initialState.flashcardDecks || {})),
    flashcardStudyState: new Map(Object.entries(initialState.flashcardStudyState || {})),
    quizzes: new Map(Object.entries(initialState.quizzes || {})),
    quizAttempts: new Map(Object.entries(initialState.quizAttempts || {})),
    chats: new Map(Object.entries(initialState.scopedChats || {})),
    history: [...(initialState.studyHistory || [])],
    metadata: new Map([["storage_version", 1]])
  };

  return {
    async loadAllState() {
      return {
        documents: Array.from(store.documents.values()),
        subjects: Array.from(store.subjects.values()),
        summaries: Object.fromEntries(store.summaries),
        flashcardDecks: Object.fromEntries(store.flashcards),
        flashcardStudyState: Object.fromEntries(store.flashcardStudyState),
        quizzes: Object.fromEntries(store.quizzes),
        quizAttempts: Object.fromEntries(store.quizAttempts),
        scopedChats: Object.fromEntries(store.chats),
        storageVersion: 1
      };
    },
    async saveDocument(doc) {
      if (doc && doc.id) store.documents.set(doc.id, doc);
    },
    async saveSubject(subj) {
      if (subj && subj.id) store.subjects.set(subj.id, subj);
    },
    async saveSummary(key, val) {
      if (key && val) store.summaries.set(key, val);
    },
    async saveFlashcards(key, val, studyState = null) {
      if (key && val) {
        store.flashcards.set(key, val);
        if (studyState) store.flashcardStudyState.set(key, studyState);
      }
    },
    async saveQuiz(key, val, attempt = null) {
      if (key && val) {
        store.quizzes.set(key, val);
        if (attempt) store.quizAttempts.set(key, attempt);
      }
    },
    async saveChat(key, val) {
      if (key && val) store.chats.set(key, val);
    },
    async recordStudyHistory(h) {
      if (h && h.id) store.history.push(h);
    },
    async getStudyHistory() {
      return [...store.history];
    },
    async clearAll() {
      store.documents.clear();
      store.subjects.clear();
      store.summaries.clear();
      store.flashcards.clear();
      store.flashcardStudyState.clear();
      store.quizzes.clear();
      store.quizAttempts.clear();
      store.chats.clear();
      store.history = [];
    }
  };
}

test('Phase 10 — Export / Import / Backup Test Suite', async (t) => {

  const sampleState = {
    documents: [
      {
        id: "doc_101",
        name: "Cell_Biology.pdf",
        size: 2048,
        pageCount: 3,
        subjectId: "subj_bio",
        subjectName: "Biology",
        fullText: "Mitochondria produce cellular ATP through oxidative phosphorylation.",
        chunks: [{ page: 1, text: "Mitochondria produce ATP." }]
      }
    ],
    subjects: [
      {
        id: "subj_bio",
        name: "Biology",
        documentIds: ["doc_101"],
        createdAt: "2026-09-01T10:00:00.000Z"
      }
    ],
    summaries: {
      "doc_doc_101": {
        shortSummary: "Overview of cell energetics.",
        keyConcepts: ["Mitochondria", "ATP"],
        importantDefinitions: [{ term: "ATP", definition: "Adenosine Triphosphate" }],
        importantPoints: ["ATP powers cellular reactions."],
        examPoints: ["ATP synthase mechanism"]
      }
    },
    flashcardDecks: {
      "doc_doc_101": {
        title: "Cell Bio Deck",
        cards: [{ question: "What is ATP?", answer: "Energy currency", difficulty: "easy" }],
        count: 1
      }
    },
    flashcardStudyState: {
      "doc_doc_101": {
        currentIndex: 0,
        ratings: { 0: "easy" }
      }
    },
    quizzes: {
      "doc_doc_101": {
        id: "quiz_101",
        title: "Cell Bio Quiz",
        questions: [
          {
            id: "q1",
            type: "mcq",
            question: "Where is ATP synthesized?",
            options: ["Mitochondria", "Nucleus"],
            correctAnswer: 0
          }
        ]
      }
    },
    quizAttempts: {
      "doc_doc_101": {
        submitted: true,
        results: { percentage: 100, score: 1, totalQuestions: 1 }
      }
    },
    scopedChats: {
      "doc_doc_101": [
        { role: "user", content: "What does mitochondria do?" },
        { role: "assistant", content: "Mitochondria generate ATP." }
      ]
    },
    studyHistory: [
      {
        id: "hist_1",
        type: "quiz_completed",
        subjectId: "subj_bio",
        documentId: "doc_101",
        title: "Completed Cell Bio Quiz",
        score: 1,
        percentage: 100,
        timestamp: "2026-09-02T12:00:00.000Z"
      }
    ]
  };

  // =========================================================================
  // TEST 1: Export creates valid ASTRA backup structure
  // =========================================================================
  await t.test('TEST 1: Export creates valid ASTRA backup structure', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });

    assert.equal(backup.format, BACKUP_FORMAT);
    assert.equal(backup.version, BACKUP_VERSION);
    assert.ok(backup.exportedAt);
    assert.equal(backup.app.name, "ASTRA AI");
  });

  // =========================================================================
  // TEST 2: Export includes documents
  // =========================================================================
  await t.test('TEST 2: Export includes documents', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });

    assert.equal(backup.documents.length, 1);
    assert.equal(backup.documents[0].id, "doc_101");
    assert.equal(backup.documents[0].name, "Cell_Biology.pdf");
    assert.ok(backup.documents[0].fullText.includes("Mitochondria"));
  });

  // =========================================================================
  // TEST 3: Export includes subjects and relationships
  // =========================================================================
  await t.test('TEST 3: Export includes subjects and relationships', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });

    assert.equal(backup.subjects.length, 1);
    assert.equal(backup.subjects[0].id, "subj_bio");
    assert.deepEqual(backup.subjects[0].documentIds, ["doc_101"]);
  });

  // =========================================================================
  // TEST 4: Export includes summaries
  // =========================================================================
  await t.test('TEST 4: Export includes summaries', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });

    assert.ok(backup.summaries["doc_doc_101"]);
    assert.equal(backup.summaries["doc_doc_101"].shortSummary, "Overview of cell energetics.");
  });

  // =========================================================================
  // TEST 5: Export includes flashcard decks and study state
  // =========================================================================
  await t.test('TEST 5: Export includes flashcard decks and study state', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });

    assert.ok(backup.flashcardDecks["doc_doc_101"]);
    assert.equal(backup.flashcardDecks["doc_doc_101"].cards.length, 1);
    assert.equal(backup.flashcardStudyState["doc_doc_101"].ratings[0], "easy");
  });

  // =========================================================================
  // TEST 6: Export includes quizzes and attempts
  // =========================================================================
  await t.test('TEST 6: Export includes quizzes and attempts', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });

    assert.ok(backup.quizzes["doc_doc_101"]);
    assert.equal(backup.quizzes["doc_doc_101"].questions.length, 1);
    assert.equal(backup.quizAttempts["doc_doc_101"].results.percentage, 100);
  });

  // =========================================================================
  // TEST 7: Export includes scoped chats and study history
  // =========================================================================
  await t.test('TEST 7: Export includes scoped chats and study history', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });

    assert.ok(backup.scopedChats["doc_doc_101"]);
    assert.equal(backup.scopedChats["doc_doc_101"].length, 2);
    assert.equal(backup.studyHistory.length, 1);
    assert.equal(backup.studyHistory[0].title, "Completed Cell Bio Quiz");
  });

  // =========================================================================
  // TEST 8: Export does not contain API keys or environment secrets
  // =========================================================================
  await t.test('TEST 8: Export does not contain API keys or environment secrets', async () => {
    const dirtyState = {
      ...sampleState,
      documents: [
        {
          ...sampleState.documents[0],
          apiKey: "sk-or-v1-secret-leaked-key",
          token: "secret-token-12345"
        }
      ]
    };
    const mockStorage = createMockStorage(dirtyState);
    const backup = await exportBackup({ storage: mockStorage });
    const jsonString = JSON.stringify(backup);

    assert.ok(!jsonString.includes("sk-or-v1-secret-leaked-key"));
    assert.ok(!jsonString.includes("secret-token-12345"));
    assert.ok(!jsonString.includes("OPENROUTER_API_KEY"));
    assert.ok(!jsonString.includes("VITE_OPENROUTER_API_KEY"));
  });

  // =========================================================================
  // TEST 9: Valid backup passes validation
  // =========================================================================
  await t.test('TEST 9: Valid backup passes validation', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });
    const validation = validateBackup(backup);

    assert.equal(validation.isValid, true);
  });

  // =========================================================================
  // TEST 10: Malformed JSON is rejected safely
  // =========================================================================
  await t.test('TEST 10: Malformed JSON is rejected safely', () => {
    const malformed = "{ format: 'astra-backup', broken json ";
    const parseResult = parseBackupJson(malformed);

    assert.equal(parseResult.success, false);
    assert.ok(parseResult.error.includes("Malformed JSON"));
  });

  // =========================================================================
  // TEST 11: Wrong format is rejected
  // =========================================================================
  await t.test('TEST 11: Wrong format is rejected', () => {
    const wrongFormat = {
      format: "not-astra-backup",
      version: 1,
      documents: []
    };
    const validation = validateBackup(wrongFormat);

    assert.equal(validation.isValid, false);
    assert.ok(validation.error.includes("Invalid backup format"));
  });

  // =========================================================================
  // TEST 12: Unsupported version is rejected
  // =========================================================================
  await t.test('TEST 12: Unsupported version is rejected', () => {
    const futureVersion = {
      format: "astra-backup",
      version: 99,
      documents: []
    };
    const validation = validateBackup(futureVersion);

    assert.equal(validation.isValid, false);
    assert.ok(validation.error.includes("newer or unsupported version"));
  });

  // =========================================================================
  // TEST 13: Import preview calculates correct counts
  // =========================================================================
  await t.test('TEST 13: Import preview calculates correct counts', async () => {
    const mockStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: mockStorage });
    const preview = previewBackup(backup);

    assert.equal(preview.documentCount, 1);
    assert.equal(preview.subjectCount, 1);
    assert.equal(preview.summaryCount, 1);
    assert.equal(preview.flashcardDeckCount, 1);
    assert.equal(preview.totalFlashcards, 1);
    assert.equal(preview.quizCount, 1);
    assert.equal(preview.quizAttemptCount, 1);
    assert.equal(preview.chatMessageCount, 2);
    assert.equal(preview.historyCount, 1);
  });

  // =========================================================================
  // TEST 14: Replace restore produces correct data
  // =========================================================================
  await t.test('TEST 14: Replace restore produces correct data', async () => {
    const initialTargetState = {
      documents: [{ id: "old_doc", name: "Old.pdf", subjectId: "old_s" }],
      subjects: [{ id: "old_s", name: "Old Subject", documentIds: ["old_doc"] }]
    };
    const targetStorage = createMockStorage(initialTargetState);

    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "replace", storage: targetStorage });
    assert.equal(result.success, true);
    assert.equal(result.stats.mode, "replace");

    const stateAfter = await targetStorage.loadAllState();
    assert.equal(stateAfter.documents.length, 1);
    assert.equal(stateAfter.documents[0].id, "doc_101");
    assert.equal(stateAfter.subjects[0].id, "subj_bio");
  });

  // =========================================================================
  // TEST 15: Merge restore preserves current data
  // =========================================================================
  await t.test('TEST 15: Merge restore preserves current data', async () => {
    const existingState = {
      documents: [
        { id: "doc_existing", name: "Existing.pdf", subjectId: "subj_math", fullText: "Calculus" }
      ],
      subjects: [
        { id: "subj_math", name: "Math", documentIds: ["doc_existing"] }
      ]
    };
    const targetStorage = createMockStorage(existingState);

    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "merge", storage: targetStorage });
    assert.equal(result.success, true);

    const stateAfter = await targetStorage.loadAllState();
    assert.equal(stateAfter.documents.length, 2);
    assert.equal(stateAfter.subjects.length, 2);
    assert.ok(stateAfter.documents.some(d => d.id === "doc_existing"));
    assert.ok(stateAfter.documents.some(d => d.id === "doc_101"));
  });

  // =========================================================================
  // TEST 16: Duplicate identical entities do not duplicate unnecessarily
  // =========================================================================
  await t.test('TEST 16: Duplicate identical entities do not duplicate unnecessarily', async () => {
    const targetStorage = createMockStorage(sampleState);
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    // Merging identical backup into existing identical data
    const result = await restoreBackup(backup, { mode: "merge", storage: targetStorage });
    assert.equal(result.success, true);

    const stateAfter = await targetStorage.loadAllState();
    assert.equal(stateAfter.documents.length, 1); // Not duplicated
    assert.equal(stateAfter.subjects.length, 1);
  });

  // =========================================================================
  // TEST 17: Conflicting IDs are handled safely
  // =========================================================================
  await t.test('TEST 17: Conflicting IDs are handled safely', async () => {
    const existingState = {
      documents: [
        { id: "doc_101", name: "Physics.pdf", subjectId: "subj_phys", fullText: "Quantum mechanics" }
      ],
      subjects: [
        { id: "subj_phys", name: "Physics", documentIds: ["doc_101"] }
      ]
    };
    const targetStorage = createMockStorage(existingState);

    // sampleState also uses "doc_101" but has Cell_Biology.pdf content
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "merge", storage: targetStorage });
    assert.equal(result.success, true);

    const stateAfter = await targetStorage.loadAllState();
    assert.equal(stateAfter.documents.length, 2);
    assert.ok(stateAfter.documents.some(d => d.id === "doc_101" && d.name === "Physics.pdf"));
    assert.ok(stateAfter.documents.some(d => d.id !== "doc_101" && d.name.includes("Cell_Biology.pdf")));
  });

  // =========================================================================
  // TEST 18: Document/subject relationships remain valid after merge
  // =========================================================================
  await t.test('TEST 18: Document/subject relationships remain valid after merge', async () => {
    const targetStorage = createMockStorage({});
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    await restoreBackup(backup, { mode: "merge", storage: targetStorage });
    const stateAfter = await targetStorage.loadAllState();

    const docMap = new Map(stateAfter.documents.map(d => [d.id, d]));
    const subjMap = new Map(stateAfter.subjects.map(s => [s.id, s]));

    for (const doc of stateAfter.documents) {
      assert.ok(subjMap.has(doc.subjectId), `Doc ${doc.id} must point to valid subject`);
    }
    for (const subj of stateAfter.subjects) {
      for (const docId of subj.documentIds) {
        assert.ok(docMap.has(docId), `Subject ${subj.id} must only point to valid doc`);
      }
    }
  });

  // =========================================================================
  // TEST 19: Invalid references are cleaned
  // =========================================================================
  await t.test('TEST 19: Invalid references are cleaned', async () => {
    const dirtyBackup = {
      format: "astra-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      documents: [
        { id: "doc_valid", name: "Valid.pdf", subjectId: "non_existent_subject" }
      ],
      subjects: [
        { id: "subj_valid", name: "Valid Subj", documentIds: ["doc_valid", "ghost_doc_id"] }
      ]
    };

    const targetStorage = createMockStorage({});
    await restoreBackup(dirtyBackup, { mode: "replace", storage: targetStorage });
    const stateAfter = await targetStorage.loadAllState();

    const subj = stateAfter.subjects.find(s => s.id === "subj_valid");
    assert.ok(!subj.documentIds.includes("ghost_doc_id"));
    assert.ok(subj.documentIds.includes("doc_valid"));
  });

  // =========================================================================
  // TEST 20: Search index rebuilds after restore
  // =========================================================================
  await t.test('TEST 20: Search index rebuilds after restore', async () => {
    const targetStorage = createMockStorage({});
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "replace", storage: targetStorage });
    resetSearchIndexCache();

    const searchResults = searchStudyMaterial("Mitochondria", result.restoredState.documents);
    assert.ok(searchResults.length > 0);
    assert.ok(searchResults[0].documentName.includes("Cell_Biology"));
  });

  // =========================================================================
  // TEST 21: Dashboard metrics update after restore
  // =========================================================================
  await t.test('TEST 21: Dashboard metrics update after restore', async () => {
    const targetStorage = createMockStorage({});
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "replace", storage: targetStorage });
    const attempts = result.restoredState.quizAttempts;

    const avgScore = calculateAverageQuizScore(attempts);
    const totalQuizzes = calculateCompletedQuizzesCount(attempts);

    assert.equal(avgScore, 100);
    assert.equal(totalQuizzes, 1);
  });

  // =========================================================================
  // TEST 22: Restored summaries are available without new API calls
  // =========================================================================
  await t.test('TEST 22: Restored summaries are available without new API calls', async () => {
    const targetStorage = createMockStorage({});
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "replace", storage: targetStorage });
    const summary = result.restoredState.summaries["doc_doc_101"];

    assert.ok(summary);
    assert.equal(summary.shortSummary, "Overview of cell energetics.");
    assert.deepEqual(summary.keyConcepts, ["Mitochondria", "ATP"]);
  });

  // =========================================================================
  // TEST 23: Restored flashcards are available without new API calls
  // =========================================================================
  await t.test('TEST 23: Restored flashcards are available without new API calls', async () => {
    const targetStorage = createMockStorage({});
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "replace", storage: targetStorage });
    const deck = result.restoredState.flashcardDecks["doc_doc_101"];

    assert.ok(deck);
    assert.equal(deck.cards[0].question, "What is ATP?");
  });

  // =========================================================================
  // TEST 24: Restored quizzes are available without new API calls
  // =========================================================================
  await t.test('TEST 24: Restored quizzes are available without new API calls', async () => {
    const targetStorage = createMockStorage({});
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "replace", storage: targetStorage });
    const quiz = result.restoredState.quizzes["doc_doc_101"];

    assert.ok(quiz);
    assert.equal(quiz.questions[0].question, "Where is ATP synthesized?");
  });

  // =========================================================================
  // TEST 25: Restored chat history remains correctly scoped
  // =========================================================================
  await t.test('TEST 25: Restored chat history remains correctly scoped', async () => {
    const targetStorage = createMockStorage({});
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "replace", storage: targetStorage });
    const chat = result.restoredState.scopedChats["doc_doc_101"];

    assert.ok(chat);
    assert.equal(chat.length, 2);
    assert.equal(chat[0].content, "What does mitochondria do?");
  });

  // =========================================================================
  // TEST 26: Restore does not require browser reload
  // =========================================================================
  await t.test('TEST 26: Restore does not require browser reload', async () => {
    const targetStorage = createMockStorage({});
    const sourceStorage = createMockStorage(sampleState);
    const backup = await exportBackup({ storage: sourceStorage });

    const result = await restoreBackup(backup, { mode: "replace", storage: targetStorage });
    assert.ok(result.restoredState, "Returned restoredState can be directly passed to store without window.location.reload");
    assert.equal(result.restoredState.documents.length, 1);
  });

});
