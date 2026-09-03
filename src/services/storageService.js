/**
 * ASTRA AI Local Persistence Service
 * 
 * Browser-native IndexedDB storage for local study materials, summaries,
 * flashcards, quizzes, chat history, and study activity.
 */

const DB_NAME = "AstraAI_DB";
const DB_VERSION = 1;
export const ASTRA_STORAGE_VERSION = 1;

const STORES = {
  DOCUMENTS: "documents",
  SUBJECTS: "subjects",
  SUMMARIES: "summaries",
  FLASHCARDS: "flashcards",
  QUIZZES: "quizzes",
  CHATS: "chats",
  STUDY_HISTORY: "study_history",
  METADATA: "metadata"
};

// In-Memory Fallback if IndexedDB is unavailable or running in Node.js
const memoryFallback = {
  [STORES.DOCUMENTS]: new Map(),
  [STORES.SUBJECTS]: new Map(),
  [STORES.SUMMARIES]: new Map(),
  [STORES.FLASHCARDS]: new Map(),
  [STORES.QUIZZES]: new Map(),
  [STORES.CHATS]: new Map(),
  [STORES.STUDY_HISTORY]: new Map(),
  [STORES.METADATA]: new Map()
};

let dbInstance = null;
let isIndexedDBAvailable = null;

/**
 * Check if IndexedDB is supported in the current runtime environment
 */
export function checkIndexedDBAvailable() {
  if (isIndexedDBAvailable !== null) return isIndexedDBAvailable;

  try {
    if (typeof window !== "undefined" && typeof window.indexedDB !== "undefined" && window.indexedDB !== null) {
      isIndexedDBAvailable = true;
    } else if (typeof globalThis !== "undefined" && typeof globalThis.indexedDB !== "undefined" && globalThis.indexedDB !== null) {
      isIndexedDBAvailable = true;
    } else {
      isIndexedDBAvailable = false;
    }
  } catch {
    isIndexedDBAvailable = false;
  }

  return isIndexedDBAvailable;
}

/**
 * Open or initialize the IndexedDB connection
 */
export function openDatabase() {
  if (!checkIndexedDBAvailable()) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve) => {
    try {
      const idb = typeof window !== "undefined" ? window.indexedDB : globalThis.indexedDB;
      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create Object Stores if they do not exist
        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          db.createObjectStore(STORES.DOCUMENTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.SUBJECTS)) {
          db.createObjectStore(STORES.SUBJECTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.SUMMARIES)) {
          db.createObjectStore(STORES.SUMMARIES, { keyPath: "scopeKey" });
        }
        if (!db.objectStoreNames.contains(STORES.FLASHCARDS)) {
          db.createObjectStore(STORES.FLASHCARDS, { keyPath: "scopeKey" });
        }
        if (!db.objectStoreNames.contains(STORES.QUIZZES)) {
          db.createObjectStore(STORES.QUIZZES, { keyPath: "scopeKey" });
        }
        if (!db.objectStoreNames.contains(STORES.CHATS)) {
          db.createObjectStore(STORES.CHATS, { keyPath: "scopeKey" });
        }
        if (!db.objectStoreNames.contains(STORES.STUDY_HISTORY)) {
          db.createObjectStore(STORES.STUDY_HISTORY, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: "key" });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.warn("IndexedDB open error, falling back to in-memory storage:", event.target.error);
        resolve(null);
      };
    } catch (err) {
      console.warn("IndexedDB initialization error:", err);
      resolve(null);
    }
  });
}

/**
 * Helper: Perform an asynchronous store transaction
 */
async function getStore(storeName, mode = "readonly") {
  const db = await openDatabase();
  if (!db) return null;

  try {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  } catch (err) {
    console.warn(`Failed to create transaction for store ${storeName}:`, err);
    return null;
  }
}

/**
 * Generic Put/Save item
 */
export async function setItem(storeName, item) {
  if (!item) return;

  const store = await getStore(storeName, "readwrite");
  if (!store) {
    // In-memory fallback
    const key = item.id || item.scopeKey || item.key;
    if (key && memoryFallback[storeName]) {
      memoryFallback[storeName].set(key, item);
    }
    return;
  }

  return new Promise((resolve) => {
    try {
      const req = store.put(item);
      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn(`IndexedDB put error on ${storeName}:`, req.error);
        resolve(false);
      };
    } catch (err) {
      console.warn(`IndexedDB put exception on ${storeName}:`, err);
      resolve(false);
    }
  });
}

/**
 * Generic Get item by key
 */
export async function getItem(storeName, key) {
  const store = await getStore(storeName, "readonly");
  if (!store) {
    if (memoryFallback[storeName]) {
      return memoryFallback[storeName].get(key) || null;
    }
    return null;
  }

  return new Promise((resolve) => {
    try {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generic Get All items from a store
 */
export async function getAllItems(storeName) {
  const store = await getStore(storeName, "readonly");
  if (!store) {
    if (memoryFallback[storeName]) {
      return Array.from(memoryFallback[storeName].values());
    }
    return [];
  }

  return new Promise((resolve) => {
    try {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Generic Delete item by key
 */
export async function deleteItem(storeName, key) {
  const store = await getStore(storeName, "readwrite");
  if (!store) {
    if (memoryFallback[storeName]) {
      memoryFallback[storeName].delete(key);
    }
    return;
  }

  return new Promise((resolve) => {
    try {
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Generic Clear an entire store
 */
export async function clearStore(storeName) {
  const store = await getStore(storeName, "readwrite");
  if (!store) {
    if (memoryFallback[storeName]) {
      memoryFallback[storeName].clear();
    }
    return;
  }

  return new Promise((resolve) => {
    try {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ==========================================
// Specialized High-Level Persistence APIs
// ==========================================

export const storageService = {
  // --- Documents ---
  async saveDocument(doc) {
    if (!doc || !doc.id) return;
    // Ensure raw binary / File objects are never saved
    const cleanDoc = {
      id: doc.id,
      name: doc.name || "Untitled Document",
      size: doc.size || 0,
      pageCount: doc.pageCount || 1,
      subjectId: doc.subjectId || "general",
      subjectName: doc.subjectName || "General",
      fullText: doc.fullText || "",
      chunks: Array.isArray(doc.chunks) ? doc.chunks : [],
      uploadedAt: doc.uploadedAt || new Date().toISOString(),
      status: doc.status || "ready"
    };
    await setItem(STORES.DOCUMENTS, cleanDoc);
  },

  async getDocument(id) {
    return getItem(STORES.DOCUMENTS, id);
  },

  async getAllDocuments() {
    return getAllItems(STORES.DOCUMENTS);
  },

  async deleteDocument(id) {
    await deleteItem(STORES.DOCUMENTS, id);
    // Also remove document-scoped artifacts
    await deleteItem(STORES.SUMMARIES, `doc_${id}`);
    await deleteItem(STORES.FLASHCARDS, `doc_${id}`);
    await deleteItem(STORES.QUIZZES, `doc_${id}`);
    await deleteItem(STORES.CHATS, `doc_${id}`);
  },

  // --- Subjects ---
  async saveSubject(subject) {
    if (!subject || !subject.id) return;
    const cleanSubject = {
      id: subject.id,
      name: subject.name || "General",
      documentIds: Array.isArray(subject.documentIds) ? subject.documentIds : [],
      createdAt: subject.createdAt || new Date().toISOString()
    };
    await setItem(STORES.SUBJECTS, cleanSubject);
  },

  async getAllSubjects() {
    return getAllItems(STORES.SUBJECTS);
  },

  async deleteSubject(id) {
    await deleteItem(STORES.SUBJECTS, id);
    await deleteItem(STORES.SUMMARIES, `subj_${id}`);
    await deleteItem(STORES.FLASHCARDS, `subj_${id}`);
    await deleteItem(STORES.QUIZZES, `subj_${id}`);
    await deleteItem(STORES.CHATS, `subj_${id}`);
  },

  // --- Summaries ---
  async saveSummary(scopeKey, summary) {
    if (!scopeKey || !summary) return;
    await setItem(STORES.SUMMARIES, {
      scopeKey,
      ...summary,
      savedAt: new Date().toISOString()
    });
  },

  async getAllSummaries() {
    const list = await getAllItems(STORES.SUMMARIES);
    const map = {};
    for (const item of list) {
      if (item && item.scopeKey) {
        map[item.scopeKey] = item;
      }
    }
    return map;
  },

  // --- Flashcards ---
  async saveFlashcards(scopeKey, deck, studyState = null) {
    if (!scopeKey || !deck) return;
    await setItem(STORES.FLASHCARDS, {
      scopeKey,
      ...deck,
      studyState: studyState || undefined,
      savedAt: new Date().toISOString()
    });
  },

  async getAllFlashcards() {
    const list = await getAllItems(STORES.FLASHCARDS);
    const decksMap = {};
    const studyMap = {};
    for (const item of list) {
      if (item && item.scopeKey) {
        decksMap[item.scopeKey] = {
          cards: item.cards || [],
          count: item.count || (item.cards ? item.cards.length : 0),
          generatedAt: item.generatedAt || item.savedAt,
          sourceDocumentIds: item.sourceDocumentIds || []
        };
        if (item.studyState) {
          studyMap[item.scopeKey] = item.studyState;
        }
      }
    }
    return { decks: decksMap, studyStates: studyMap };
  },

  // --- Quizzes ---
  async saveQuiz(scopeKey, quiz, attempt = null) {
    if (!scopeKey || !quiz) return;
    await setItem(STORES.QUIZZES, {
      scopeKey,
      ...quiz,
      attempt: attempt || undefined,
      savedAt: new Date().toISOString()
    });
  },

  async getAllQuizzes() {
    const list = await getAllItems(STORES.QUIZZES);
    const quizzesMap = {};
    const attemptsMap = {};
    for (const item of list) {
      if (item && item.scopeKey) {
        quizzesMap[item.scopeKey] = {
          id: item.id || `quiz_${Date.now()}`,
          title: item.title || "Practice Quiz",
          questions: item.questions || [],
          count: item.count || (item.questions ? item.questions.length : 0),
          questionType: item.questionType || "mixed",
          generatedAt: item.generatedAt || item.savedAt,
          sourceDocumentIds: item.sourceDocumentIds || []
        };
        if (item.attempt) {
          attemptsMap[item.scopeKey] = item.attempt;
        }
      }
    }
    return { quizzes: quizzesMap, attempts: attemptsMap };
  },

  // --- Chats ---
  async saveChat(scopeKey, messages = []) {
    if (!scopeKey) return;
    await setItem(STORES.CHATS, {
      scopeKey,
      messages: Array.isArray(messages) ? messages : [],
      updatedAt: new Date().toISOString()
    });
  },

  async getAllChats() {
    const list = await getAllItems(STORES.CHATS);
    const chatsMap = {};
    for (const item of list) {
      if (item && item.scopeKey) {
        chatsMap[item.scopeKey] = item.messages || [];
      }
    }
    return chatsMap;
  },

  // --- Study History Events ---
  async recordStudyHistory(event) {
    if (!event) return;
    const historyItem = {
      id: event.id || `event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: event.type || "activity",
      subjectId: event.subjectId || null,
      documentId: event.documentId || null,
      title: event.title || "Study Activity",
      score: event.score !== undefined ? event.score : null,
      percentage: event.percentage !== undefined ? event.percentage : null,
      timestamp: event.timestamp || new Date().toISOString()
    };
    await setItem(STORES.STUDY_HISTORY, historyItem);
  },

  async getStudyHistory(limit = 50) {
    const all = await getAllItems(STORES.STUDY_HISTORY);
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return all.slice(0, limit);
  },

  // --- Metadata & Versioning ---
  async setMetadata(key, value) {
    await setItem(STORES.METADATA, { key, value });
  },

  async getMetadata(key) {
    const res = await getItem(STORES.METADATA, key);
    return res ? res.value : null;
  },

  // --- Load Full Hydration State ---
  async loadAllState() {
    try {
      const [docs, subjects, summaries, flashcardsData, quizzesData, chatsMap, metaVersion] = await Promise.all([
        this.getAllDocuments(),
        this.getAllSubjects(),
        this.getAllSummaries(),
        this.getAllFlashcards(),
        this.getAllQuizzes(),
        this.getAllChats(),
        this.getMetadata("storage_version")
      ]);

      // If version is missing, store current version
      if (!metaVersion) {
        await this.setMetadata("storage_version", ASTRA_STORAGE_VERSION);
      }

      return {
        documents: docs || [],
        subjects: subjects || [],
        summaries: summaries || {},
        flashcardDecks: flashcardsData?.decks || {},
        flashcardStudyState: flashcardsData?.studyStates || {},
        quizzes: quizzesData?.quizzes || {},
        quizAttempts: quizzesData?.attempts || {},
        scopedChats: chatsMap || {},
        storageVersion: metaVersion || ASTRA_STORAGE_VERSION
      };
    } catch (err) {
      console.warn("Failed to load persisted state from IndexedDB:", err);
      return {
        documents: [],
        subjects: [],
        summaries: {},
        flashcardDecks: {},
        flashcardStudyState: {},
        quizzes: {},
        quizAttempts: {},
        scopedChats: {},
        storageVersion: ASTRA_STORAGE_VERSION
      };
    }
  },

  // --- Reset / Wipe Storage ---
  async clearAll() {
    await Promise.all(Object.values(STORES).map(s => clearStore(s)));
  }
};
