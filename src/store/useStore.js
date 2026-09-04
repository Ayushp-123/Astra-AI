import { create } from 'zustand';
import { storageService, checkIndexedDBAvailable } from '../services/storageService.js';
import { studyHistoryService } from '../services/studyHistoryService.js';
import { resetSearchIndexCache } from '../services/searchService.js';
import { authService } from '../services/authService.js';

export const useStore = create((set, get) => ({
  // Authentication State
  user: null,
  session: null,
  authLoading: false,
  authInitialized: false,
  authError: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user || null }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setAuthInitialized: (authInitialized) => set({ authInitialized }),
  setAuthError: (authError) => set({ authError }),

  initializeAuth: async () => {
    try {
      set({ authLoading: true });
      const currentSession = await authService.getCurrentSession();
      set({
        session: currentSession,
        user: currentSession?.user || null,
        authInitialized: true,
        authLoading: false
      });

      // Subscribe to real-time auth changes
      authService.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user || null
        });
      });
    } catch (err) {
      console.warn('[ASTRA Auth] Auth initialization error:', err);
      set({
        session: null,
        user: null,
        authInitialized: true,
        authLoading: false
      });
    }
  },

  signOutUser: async () => {
    try {
      set({ authLoading: true });
      await authService.signOut();
      // Only reset auth state — preserve all local IndexedDB study data
      set({
        user: null,
        session: null,
        authLoading: false,
        activeView: 'home'
      });
    } catch (err) {
      console.warn('[ASTRA Auth] Sign out error:', err);
      set({ authLoading: false });
    }
  },

  // Local Persistence & Hydration State
  isHydrating: true,
  storageAvailable: checkIndexedDBAvailable(),
  storageError: null,

  // Normalized Document state: Array of Document objects
  // Document: { id, name, size, pageCount, subjectId, subjectName, fullText, chunks, uploadedAt, status, error }
  documents: [],

  // Normalized Subject state: Array of Subject objects
  // Subject: { id, name, documentIds: string[], createdAt }
  subjects: [],

  // Active Selections & Views: 'home' | 'dashboard' | 'workspace' | 'login' | 'signup' | 'profile'
  selectedSubjectId: null,
  selectedDocumentId: null,
  activeView: 'home',
  setActiveView: (view) => set({ activeView: view }),

  // Processing state
  processing: false,
  processingProgress: 0,
  processingStatus: "",

  // Chat State (active view + persisted scoped chats)
  // scopedChats: { [scopeKey: string]: Array<Message> }
  messages: [],
  scopedChats: {},
  isAiTyping: false,
  aiTypingScopes: {},

  // Key points / Study artifacts
  keyPoints: [],

  // Summaries Cache & State
  // summaries: { [scopeKey: string]: { shortSummary, keyConcepts, importantDefinitions, importantPoints, examPoints, generatedAt } }
  summaries: {},
  summaryLoading: false,
  summaryLoadingScopes: {},
  summaryError: null,

  // Flashcards Cache & State
  // flashcardDecks: { [scopeKey: string]: { cards: Array, count: number, generatedAt: string, sourceDocumentIds: Array } }
  flashcardDecks: {},
  flashcardLoading: false,
  flashcardLoadingScopes: {},
  flashcardError: null,
  // flashcardStudyState: { [scopeKey: string]: { currentIndex: number, ratings: { [cardIndex]: 'easy'|'medium'|'hard' } } }
  flashcardStudyState: {},

  // Quizzes Cache & State
  // quizzes: { [scopeKey: string]: { id: string, title: string, questions: Array, generatedAt: string, questionType: string, count: number, sourceDocumentIds: Array } }
  quizzes: {},
  quizLoading: false,
  quizLoadingScopes: {},
  quizError: null,
  // quizAttempts: { [scopeKey: string]: { currentIndex: number, userAnswers: { [qId]: any }, submitted: boolean, results: Object|null } }
  quizAttempts: {},

  // Workspace View Tab: 'notes' | 'summary' | 'flashcards' | 'quiz'
  activeWorkspaceTab: 'notes',
  setActiveWorkspaceTab: (tab) => set({ activeWorkspaceTab: tab }),

  // Search Navigation Target: { documentId, page, matchedTerms, snippet }
  searchTarget: null,
  setSearchTarget: (searchTarget) => set({ searchTarget }),
  clearSearchTarget: () => set({ searchTarget: null }),

  // =========================================================================
  // Hydration Action: Restores persisted state from local IndexedDB
  // =========================================================================
  hydrateStore: async () => {
    try {
      set({ isHydrating: true, storageError: null });
      const savedState = await storageService.loadAllState();

      const rawDocs = savedState.documents || [];
      const rawSubjects = savedState.subjects || [];

      // Integrity check: Clean orphaned document IDs from subjects
      const validDocIds = new Set(rawDocs.map(d => d.id));
      const cleanedSubjects = rawSubjects
        .map(s => ({
          ...s,
          documentIds: Array.isArray(s.documentIds) ? s.documentIds.filter(id => validDocIds.has(id)) : []
        }))
        .filter(s => s.documentIds.length > 0);

      set({
        documents: rawDocs,
        subjects: cleanedSubjects,
        summaries: savedState.summaries || {},
        flashcardDecks: savedState.flashcardDecks || {},
        flashcardStudyState: savedState.flashcardStudyState || {},
        quizzes: savedState.quizzes || {},
        quizAttempts: savedState.quizAttempts || {},
        scopedChats: savedState.scopedChats || {},
        isHydrating: false
      });
    } catch (err) {
      console.warn("Hydration failed, operating in memory:", err);
      set({
        isHydrating: false,
        storageError: "Could not restore previous local session. Operating in memory."
      });
    }
  },

  // =========================================================================
  // Apply Restored State (from Backup Import)
  // =========================================================================
  applyRestoredState: (restoredState) => {
    if (!restoredState) return;

    const rawDocs = restoredState.documents || [];
    const rawSubjects = restoredState.subjects || [];

    const validDocIds = new Set(rawDocs.map(d => d.id));
    const cleanedSubjects = rawSubjects
      .map(s => ({
        ...s,
        documentIds: Array.isArray(s.documentIds) ? s.documentIds.filter(id => validDocIds.has(id)) : []
      }))
      .filter(s => s.documentIds.length > 0);

    // Reset Fuse search cache so it immediately indexes restored docs
    resetSearchIndexCache();

    // Check if current selection is still valid
    const currentSubj = get().selectedSubjectId;
    const currentDoc = get().selectedDocumentId;
    const isSubjValid = currentSubj && cleanedSubjects.some(s => s.id === currentSubj);
    const isDocValid = currentDoc && rawDocs.some(d => d.id === currentDoc);

    set({
      documents: rawDocs,
      subjects: cleanedSubjects,
      summaries: restoredState.summaries || {},
      flashcardDecks: restoredState.flashcardDecks || {},
      flashcardStudyState: restoredState.flashcardStudyState || {},
      quizzes: restoredState.quizzes || {},
      quizAttempts: restoredState.quizAttempts || {},
      scopedChats: restoredState.scopedChats || {},
      selectedSubjectId: isSubjValid ? currentSubj : null,
      selectedDocumentId: isDocValid ? currentDoc : null,
      searchTarget: null
    });
  },

  // =========================================================================
  // Summary Actions
  // =========================================================================
  setSummary: (key, summary) => {
    const updatedSummary = {
      ...summary,
      generatedAt: new Date().toISOString()
    };

    set((state) => ({
      summaries: {
        ...state.summaries,
        [key]: updatedSummary
      },
      summaryError: null
    }));

    // Async persist
    storageService.saveSummary(key, updatedSummary).catch(console.warn);
    studyHistoryService.recordSummaryEvent(key).catch(console.warn);
  },

  getSummary: (key) => {
    return get().summaries[key] || null;
  },

  setSummaryLoading: (summaryLoading, scopeKey = null) => set((state) => {
    const loadingScopes = { ...state.summaryLoadingScopes };
    if (scopeKey) {
      if (summaryLoading) {
        loadingScopes[scopeKey] = true;
      } else {
        delete loadingScopes[scopeKey];
      }
    }
    return {
      summaryLoading,
      summaryLoadingScopes: loadingScopes
    };
  }),
  setSummaryError: (summaryError) => set({ summaryError }),

  // =========================================================================
  // Flashcard Actions
  // =========================================================================
  setFlashcardDeck: (key, deck) => {
    const updatedDeck = {
      ...deck,
      generatedAt: new Date().toISOString()
    };
    const defaultStudy = {
      currentIndex: 0,
      ratings: {}
    };

    set((state) => ({
      flashcardDecks: {
        ...state.flashcardDecks,
        [key]: updatedDeck
      },
      flashcardStudyState: {
        ...state.flashcardStudyState,
        [key]: defaultStudy
      },
      flashcardError: null
    }));

    // Async persist
    storageService.saveFlashcards(key, updatedDeck, defaultStudy).catch(console.warn);
  },

  getFlashcardDeck: (key) => {
    return get().flashcardDecks[key] || null;
  },

  setFlashcardLoading: (flashcardLoading, scopeKey = null) => set((state) => {
    const loadingScopes = { ...state.flashcardLoadingScopes };
    if (scopeKey) {
      if (flashcardLoading) {
        loadingScopes[scopeKey] = true;
      } else {
        delete loadingScopes[scopeKey];
      }
    }
    return {
      flashcardLoading,
      flashcardLoadingScopes: loadingScopes
    };
  }),
  setFlashcardError: (flashcardError) => set({ flashcardError }),

  updateCardRating: (scopeKey, cardIndex, rating) => {
    const state = get();
    const currentStudy = state.flashcardStudyState[scopeKey] || { currentIndex: 0, ratings: {} };
    const updatedStudy = {
      ...currentStudy,
      ratings: {
        ...currentStudy.ratings,
        [cardIndex]: rating
      }
    };

    set((s) => ({
      flashcardStudyState: {
        ...s.flashcardStudyState,
        [scopeKey]: updatedStudy
      }
    }));

    const deck = state.flashcardDecks[scopeKey];
    if (deck) {
      storageService.saveFlashcards(scopeKey, deck, updatedStudy).catch(console.warn);
    }
  },

  setCardIndex: (scopeKey, index) => set((state) => {
    const currentStudy = state.flashcardStudyState[scopeKey] || { currentIndex: 0, ratings: {} };
    return {
      flashcardStudyState: {
        ...state.flashcardStudyState,
        [scopeKey]: {
          ...currentStudy,
          currentIndex: index
        }
      }
    };
  }),

  resetDeckStudyState: (scopeKey) => {
    const resetStudy = { currentIndex: 0, ratings: {} };
    set((state) => ({
      flashcardStudyState: {
        ...state.flashcardStudyState,
        [scopeKey]: resetStudy
      }
    }));

    const deck = get().flashcardDecks[scopeKey];
    if (deck) {
      storageService.saveFlashcards(scopeKey, deck, resetStudy).catch(console.warn);
    }
  },

  // =========================================================================
  // Quiz Actions
  // =========================================================================
  setQuiz: (key, quiz) => {
    const updatedQuiz = {
      ...quiz,
      generatedAt: new Date().toISOString()
    };
    const defaultAttempt = {
      currentIndex: 0,
      userAnswers: {},
      submitted: false,
      results: null
    };

    set((state) => ({
      quizzes: {
        ...state.quizzes,
        [key]: updatedQuiz
      },
      quizAttempts: {
        ...state.quizAttempts,
        [key]: defaultAttempt
      },
      quizError: null
    }));

    // Async persist
    storageService.saveQuiz(key, updatedQuiz, defaultAttempt).catch(console.warn);
  },

  getQuiz: (key) => {
    return get().quizzes[key] || null;
  },

  setQuizLoading: (quizLoading, scopeKey = null) => set((state) => {
    const loadingScopes = { ...state.quizLoadingScopes };
    if (scopeKey) {
      if (quizLoading) {
        loadingScopes[scopeKey] = true;
      } else {
        delete loadingScopes[scopeKey];
      }
    }
    return {
      quizLoading,
      quizLoadingScopes: loadingScopes
    };
  }),
  setQuizError: (quizError) => set({ quizError }),

  saveQuizAnswer: (scopeKey, questionId, answer) => set((state) => {
    const currentAttempt = state.quizAttempts[scopeKey] || {
      currentIndex: 0,
      userAnswers: {},
      submitted: false,
      results: null
    };
    return {
      quizAttempts: {
        ...state.quizAttempts,
        [scopeKey]: {
          ...currentAttempt,
          userAnswers: {
            ...currentAttempt.userAnswers,
            [questionId]: answer
          }
        }
      }
    };
  }),

  setQuizCurrentIndex: (scopeKey, index) => set((state) => {
    const currentAttempt = state.quizAttempts[scopeKey] || {
      currentIndex: 0,
      userAnswers: {},
      submitted: false,
      results: null
    };
    return {
      quizAttempts: {
        ...state.quizAttempts,
        [scopeKey]: {
          ...currentAttempt,
          currentIndex: index
        }
      }
    };
  }),

  submitQuizAttempt: (scopeKey, results) => {
    const state = get();
    const currentAttempt = state.quizAttempts[scopeKey] || {
      currentIndex: 0,
      userAnswers: {},
      submitted: false,
      results: null
    };
    const updatedAttempt = {
      ...currentAttempt,
      submitted: true,
      results
    };

    set((s) => ({
      quizAttempts: {
        ...s.quizAttempts,
        [scopeKey]: updatedAttempt
      }
    }));

    const quiz = state.quizzes[scopeKey];
    if (quiz) {
      storageService.saveQuiz(scopeKey, quiz, updatedAttempt).catch(console.warn);
      studyHistoryService.recordQuizCompletion(
        scopeKey,
        quiz.title,
        results.score,
        results.totalQuestions,
        results.percentage
      ).catch(console.warn);
    }
  },

  resetQuizAttempt: (scopeKey) => {
    const defaultAttempt = {
      currentIndex: 0,
      userAnswers: {},
      submitted: false,
      results: null
    };
    set((state) => ({
      quizAttempts: {
        ...state.quizAttempts,
        [scopeKey]: defaultAttempt
      }
    }));

    const quiz = get().quizzes[scopeKey];
    if (quiz) {
      storageService.saveQuiz(scopeKey, quiz, defaultAttempt).catch(console.warn);
    }
  },

  // =========================================================================
  // Processing State Setters
  // =========================================================================
  setProcessing: (processing) => set({ processing }),
  setProcessingProgress: (progress) => set({ processingProgress: progress }),
  setProcessingStatus: (status) => set({ processingStatus: status }),

  // =========================================================================
  // Document Actions
  // =========================================================================
  addDocument: (newDoc) => {
    set((state) => {
      const existingIndex = state.documents.findIndex((d) => d.id === newDoc.id);
      if (existingIndex >= 0) {
        const updated = [...state.documents];
        updated[existingIndex] = newDoc;
        return { documents: updated };
      }
      return { documents: [...state.documents, newDoc] };
    });

    // Async persist to IndexedDB
    storageService.saveDocument(newDoc).catch(console.warn);
    studyHistoryService.recordDocumentEvent('document_uploaded', newDoc).catch(console.warn);
  },

  removeDocument: (docId) => {
    const state = get();
    const updatedDocs = state.documents.filter((d) => d.id !== docId);

    // Clean up documentId from subjects
    const updatedSubjects = state.subjects
      .map((subj) => ({
        ...subj,
        documentIds: subj.documentIds.filter((id) => id !== docId)
      }))
      .filter((subj) => subj.documentIds.length > 0);

    // Reset active selections if needed
    let newSelectedSubjectId = state.selectedSubjectId;
    if (newSelectedSubjectId && !updatedSubjects.some((s) => s.id === newSelectedSubjectId)) {
      newSelectedSubjectId = null;
    }

    let newSelectedDocumentId = state.selectedDocumentId;
    if (newSelectedDocumentId === docId) {
      newSelectedDocumentId = null;
    }

    set({
      documents: updatedDocs,
      subjects: updatedSubjects,
      selectedSubjectId: newSelectedSubjectId,
      selectedDocumentId: newSelectedDocumentId
    });

    // Async delete from storage
    storageService.deleteDocument(docId).catch(console.warn);

    // If any subject became empty and was removed, delete from storage as well
    const removedSubjects = state.subjects.filter(
      (subj) => !updatedSubjects.some((s) => s.id === subj.id)
    );
    for (const s of removedSubjects) {
      storageService.deleteSubject(s.id).catch(console.warn);
    }
  },

  // =========================================================================
  // Subject Actions
  // =========================================================================
  addOrUpdateSubject: (subjectName, documentId) => {
    let targetSubject = null;

    set((state) => {
      const subjectId = subjectName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const existingIndex = state.subjects.findIndex(
        (s) => s.id === subjectId || s.name.toLowerCase() === subjectName.toLowerCase()
      );

      if (existingIndex >= 0) {
        const existing = state.subjects[existingIndex];
        const newDocIds = existing.documentIds.includes(documentId)
          ? existing.documentIds
          : [...existing.documentIds, documentId];

        targetSubject = {
          ...existing,
          documentIds: newDocIds
        };

        const updated = [...state.subjects];
        updated[existingIndex] = targetSubject;
        return { subjects: updated };
      } else {
        targetSubject = {
          id: subjectId,
          name: subjectName,
          documentIds: [documentId],
          createdAt: new Date().toISOString()
        };
        return { subjects: [...state.subjects, targetSubject] };
      }
    });

    if (targetSubject) {
      storageService.saveSubject(targetSubject).catch(console.warn);
    }
  },

  // =========================================================================
  // Selection / Navigation Actions
  // =========================================================================
  setSelectedSubject: (subjectOrId) => {
    if (!subjectOrId) {
      set({ selectedSubjectId: null, selectedDocumentId: null, keyPoints: [], messages: [], activeView: 'home' });
      return;
    }
    const state = get();
    const targetSubject = (typeof subjectOrId === 'object' && subjectOrId !== null)
      ? subjectOrId
      : state.subjects.find(
          (s) => s.id === subjectOrId || s.name.toLowerCase() === String(subjectOrId).toLowerCase()
        );

    if (targetSubject) {
      const firstDocId = targetSubject.documentIds?.[0] || null;
      const scopeKey = firstDocId ? `doc_${firstDocId}` : `subj_${targetSubject.id}`;
      const savedMessages = state.scopedChats[scopeKey] || [];

      set({
        selectedSubjectId: targetSubject.id,
        selectedDocumentId: firstDocId,
        keyPoints: [],
        messages: savedMessages,
        activeView: 'workspace'
      });
    } else if (typeof subjectOrId === 'string' && subjectOrId.trim()) {
      const scopeKey = `subj_${subjectOrId.trim()}`;
      const savedMessages = state.scopedChats[scopeKey] || [];

      set({
        selectedSubjectId: subjectOrId.trim(),
        selectedDocumentId: null,
        keyPoints: [],
        messages: savedMessages,
        activeView: 'workspace'
      });
    } else {
      set({ selectedSubjectId: null, selectedDocumentId: null, messages: [], activeView: 'home' });
    }
  },

  setSelectedDocumentId: (docId) => {
    const state = get();
    const scopeKey = docId ? `doc_${docId}` : (state.selectedSubjectId ? `subj_${state.selectedSubjectId}` : 'global');
    const savedMessages = state.scopedChats[scopeKey] || [];

    set({
      selectedDocumentId: docId,
      messages: savedMessages
    });
  },

  // =========================================================================
  // Selectors
  // =========================================================================
  getSelectedSubject: () => {
    const { subjects, selectedSubjectId } = get();
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  },

  getDocumentsForSubject: (subjectId) => {
    const { documents, subjects } = get();
    const targetSubject = subjects.find((s) => s.id === subjectId);
    if (!targetSubject) return [];
    return documents.filter((doc) => targetSubject.documentIds.includes(doc.id));
  },

  getActiveSubjectText: () => {
    const { selectedSubjectId, selectedDocumentId, documents, subjects } = get();
    if (!selectedSubjectId) return "";

    const targetSubject = subjects.find((s) => s.id === selectedSubjectId);
    if (!targetSubject) return "";

    const subjectDocs = documents.filter((doc) => targetSubject.documentIds.includes(doc.id));

    // If a specific document is active within the subject
    if (selectedDocumentId) {
      const activeDoc = subjectDocs.find((d) => d.id === selectedDocumentId);
      if (activeDoc) return activeDoc.fullText;
    }

    // Otherwise combine documents for the subject with clear headers
    return subjectDocs
      .map((doc) => `=== Document: ${doc.name} (Pages: ${doc.pageCount}) ===\n${doc.fullText}`)
      .join("\n\n");
  },

  // =========================================================================
  // Chat Actions
  // =========================================================================
  setMessages: (messages) => set({ messages }),

  addMessage: (message, explicitScopeKey = null) => {
    const state = get();
    const currentActiveScopeKey = state.selectedDocumentId
      ? `doc_${state.selectedDocumentId}`
      : (state.selectedSubjectId ? `subj_${state.selectedSubjectId}` : 'global');

    const targetScopeKey = explicitScopeKey || currentActiveScopeKey;
    const existingMessages = state.scopedChats[targetScopeKey] 
      ? state.scopedChats[targetScopeKey] 
      : (targetScopeKey === currentActiveScopeKey ? state.messages : []);

    const updatedMessages = [...existingMessages, message];

    const updates = {
      scopedChats: {
        ...state.scopedChats,
        [targetScopeKey]: updatedMessages
      }
    };

    if (targetScopeKey === currentActiveScopeKey) {
      updates.messages = updatedMessages;
    }

    set(updates);

    // Async persist chat
    storageService.saveChat(targetScopeKey, updatedMessages).catch(console.warn);
  },

  setIsAiTyping: (isTyping, scopeKey = null) => set((state) => {
    const aiTypingScopes = { ...state.aiTypingScopes };
    if (scopeKey) {
      if (isTyping) {
        aiTypingScopes[scopeKey] = true;
      } else {
        delete aiTypingScopes[scopeKey];
      }
    }
    return {
      isAiTyping: isTyping,
      aiTypingScopes
    };
  }),

  // Key Points
  setKeyPoints: (points) => set({ keyPoints: points })
}));
