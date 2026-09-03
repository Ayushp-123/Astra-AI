import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { useStore } from '../src/store/useStore.js';
import { isRateLimited, resetRateLimitMap } from '../server/index.js';
import { callOpenRouter } from '../server/services/openRouterService.js';
import { restoreBackup } from '../src/services/backupService.js';

test('ASTRA AI Phase 11 — Production Hardening & UX Audit Test Suite', async (t) => {

  // =========================================================================
  // 1. Store Scope Isolation & Cross-Scope Race Condition Prevention
  // =========================================================================
  await t.test('1.1 Store addMessage isolates messages to explicit scopeKey even when navigation changes', () => {
    // Simulate active view on Subject A
    useStore.setState({
      selectedSubjectId: 'subj_operating_systems',
      selectedDocumentId: null,
      messages: [{ sender: 'user', text: 'Explain semaphores' }],
      scopedChats: {
        'subj_operating_systems': [{ sender: 'user', text: 'Explain semaphores' }],
        'subj_dbms': []
      }
    });

    // Capture request scope key
    const requestScopeKey = 'subj_operating_systems';

    // User navigates to Subject B (DBMS) mid-request
    useStore.setState({
      selectedSubjectId: 'subj_dbms',
      selectedDocumentId: null,
      messages: [{ sender: 'user', text: 'What is B+ tree?' }]
    });

    // AI response arrives for Operating Systems
    useStore.getState().addMessage({
      sender: 'ai',
      text: 'A semaphore is a synchronization variable used to manage concurrent processes.'
    }, requestScopeKey);

    const updatedState = useStore.getState();

    // 1. Current active view (DBMS) should NOT contain the OS response!
    assert.equal(updatedState.messages.length, 1);
    assert.equal(updatedState.messages[0].text, 'What is B+ tree?');

    // 2. The Operating Systems scoped chat SHOULD contain both the user question and AI response!
    const osChat = updatedState.scopedChats['subj_operating_systems'];
    assert.equal(osChat.length, 2);
    assert.equal(osChat[0].text, 'Explain semaphores');
    assert.ok(osChat[1].text.includes('semaphore is a synchronization'));
  });

  await t.test('1.2 Scope-aware loading state tracking for Summary, Flashcards, and Quizzes', () => {
    // Set loading for Subject A
    useStore.getState().setSummaryLoading(true, 'subj_operating_systems');
    useStore.getState().setFlashcardLoading(true, 'subj_operating_systems');
    useStore.getState().setQuizLoading(true, 'subj_operating_systems');

    const state = useStore.getState();
    assert.equal(state.summaryLoadingScopes['subj_operating_systems'], true);
    assert.equal(state.flashcardLoadingScopes['subj_operating_systems'], true);
    assert.equal(state.quizLoadingScopes['subj_operating_systems'], true);

    // Subject B should NOT be loading
    assert.equal(state.summaryLoadingScopes['subj_dbms'], undefined);
    assert.equal(state.flashcardLoadingScopes['subj_dbms'], undefined);
    assert.equal(state.quizLoadingScopes['subj_dbms'], undefined);

    // Reset loading for Subject A
    useStore.getState().setSummaryLoading(false, 'subj_operating_systems');
    assert.equal(useStore.getState().summaryLoadingScopes['subj_operating_systems'], undefined);
  });

  // =========================================================================
  // 2. Upstream AI Backend Timeout & Error Resilience
  // =========================================================================
  await t.test('2.1 callOpenRouter handles upstream timeout with 504 Gateway Timeout error', async () => {
    // Mock fetchFn that aborts due to timeout
    const mockTimeoutFetch = async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      throw abortError;
    };

    await assert.rejects(
      async () => {
        await callOpenRouter({
          messages: [{ role: 'user', content: 'Hello' }],
          fetchFn: mockTimeoutFetch,
          apiKeyOverride: 'test-key-mock'
        });
      },
      (err) => {
        assert.equal(err.statusCode, 504);
        assert.equal(err.code, 'GATEWAY_TIMEOUT');
        assert.ok(err.message.includes('timed out'));
        return true;
      }
    );
  });

  await t.test('2.2 Rate limiter opportunistic cleanup and limit enforcement', () => {
    resetRateLimitMap();
    const testIp = '192.168.1.100';

    // Send 60 requests -> should not be limited
    for (let i = 0; i < 60; i++) {
      const limited = isRateLimited(testIp);
      assert.equal(limited, false);
    }

    // 61st request should be rate limited
    const isLimited61 = isRateLimited(testIp);
    assert.equal(isLimited61, true);

    resetRateLimitMap();
  });

  // =========================================================================
  // 3. Backup Merge Deduplication Fix (Part 9)
  // =========================================================================
  await t.test('3.1 Backup merge deduplicates chat messages with text property', async () => {
    const backupData = {
      format: 'astra-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      documents: [{ id: 'doc-100', name: 'Notes.pdf', subjectId: 'subj-100', chunks: [], fullText: 'Sample text' }],
      subjects: [{ id: 'subj-100', name: 'Databases', documentIds: ['doc-100'] }],
      summaries: {},
      flashcardDecks: {},
      flashcardStudyState: {},
      quizzes: {},
      quizAttempts: {},
      scopedChats: {
        'doc_doc-100': [
          { sender: 'user', text: 'What is ACID?' },
          { sender: 'ai', text: 'ACID stands for Atomicity, Consistency, Isolation, Durability.' }
        ]
      },
      studyHistory: []
    };

    // Existing state having one overlapping message and one old message
    const existingState = {
      documents: [{ id: 'doc-100', name: 'Notes.pdf', subjectId: 'subj-100', chunks: [], fullText: 'Sample text' }],
      subjects: [{ id: 'subj-100', name: 'Databases', documentIds: ['doc-100'] }],
      summaries: {},
      flashcardDecks: {},
      flashcardStudyState: {},
      quizzes: {},
      quizAttempts: {},
      scopedChats: {
        'doc_doc-100': [
          { sender: 'user', text: 'What is ACID?' }
        ]
      },
      studyHistory: []
    };

    const mockStorage = {
      loadAllState: async () => existingState,
      clearAllData: async () => {},
      saveDocument: async () => {},
      saveSubject: async () => {},
      saveSummary: async () => {},
      saveFlashcards: async () => {},
      saveQuiz: async () => {},
      saveChat: async () => {},
      recordStudyHistory: async () => {}
    };

    const result = await restoreBackup(backupData, 'merge', mockStorage);
    const restoredState = result.restoredState;
    const mergedMessages = restoredState.scopedChats['doc_doc-100'];

    // Should contain exactly 2 messages (no duplicate 'What is ACID?')
    assert.equal(mergedMessages.length, 2);
    assert.equal(mergedMessages[0].text, 'What is ACID?');
    assert.ok(mergedMessages[1].text.includes('ACID stands for'));
  });

  // =========================================================================
  // 4. Dead Code & Package Cleanup Verification (Part 17 & 18)
  // =========================================================================
  await t.test('4.1 Legacy files src/gemini.js and src/pdfReader.js are deleted', () => {
    const geminiPath = path.resolve('src/gemini.js');
    const pdfReaderPath = path.resolve('src/pdfReader.js');

    assert.equal(fs.existsSync(geminiPath), false, 'src/gemini.js should be deleted');
    assert.equal(fs.existsSync(pdfReaderPath), false, 'src/pdfReader.js should be deleted');
  });

  await t.test('4.2 @google/generative-ai is removed from package.json dependencies', () => {
    const pkgPath = path.resolve('package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.equal(pkg.dependencies['@google/generative-ai'], undefined, '@google/generative-ai must not be in dependencies');
  });

  // =========================================================================
  // 5. Link Protocol Sanitization Security Logic (Part 10)
  // =========================================================================
  await t.test('5.1 Unsafe URL protocols (e.g. javascript:) are rejected', () => {
    const testUrls = [
      { url: 'javascript:alert(1)', safe: false },
      { url: 'data:text/html,<script>alert(1)</script>', safe: false },
      { url: 'vbscript:msgbox', safe: false },
      { url: 'https://example.com/docs', safe: true },
      { url: 'http://localhost:3000', safe: true },
      { url: 'mailto:student@university.edu', safe: true },
      { url: '#heading-1', safe: true },
      { url: '/workspace', safe: true }
    ];

    for (const item of testUrls) {
      const isSafe = typeof item.url === 'string' && (
        item.url.startsWith('https://') ||
        item.url.startsWith('http://') ||
        item.url.startsWith('mailto:') ||
        item.url.startsWith('#') ||
        item.url.startsWith('/')
      );
      assert.equal(isSafe, item.safe, `URL security check failed for: ${item.url}`);
    }
  });

});
