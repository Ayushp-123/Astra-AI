/**
 * ASTRA AI Local Backup & Restore Service
 * 
 * Provides client-side export, import, schema validation, preview calculation,
 * conflict resolution (Merge / Replace), and relationship integrity verification
 * for all locally persisted student study data.
 * 
 * 100% Local & Privacy-Preserving: No cloud storage, no server uploads, no secrets.
 */

import { storageService } from './storageService.js';

export const BACKUP_FORMAT = "astra-backup";
export const BACKUP_VERSION = 1;

/**
 * Identify any sensitive or binary property keys dynamically
 */
function isForbiddenProperty(key) {
  const lower = String(key || "").toLowerCase();
  return (
    lower === "apikey" ||
    lower === "api_key" ||
    lower === "token" ||
    lower === "secret" ||
    lower === "password" ||
    lower === "auth" ||
    lower === "authorization" ||
    lower.includes("secret") ||
    lower.includes("password") ||
    lower.includes("token") ||
    lower === "rawfile" ||
    lower === "filebuffer" ||
    lower === "arraybuffer"
  );
}

/**
 * Remove any potential sensitive properties or binary artifacts
 */
function sanitizeEntity(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const clean = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (isForbiddenProperty(key)) continue;

    // Disallow binary / File instances
    if (typeof File !== "undefined" && value instanceof File) continue;
    if (typeof Blob !== "undefined" && value instanceof Blob) continue;
    if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) continue;

    if (value && typeof value === "object") {
      clean[key] = sanitizeEntity(value);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Export all local student data into a structured ASTRA backup payload
 * 
 * @param {Object} options - { storage }
 * @returns {Promise<Object>} Standard ASTRA backup object
 */
export async function exportBackup(options = {}) {
  const storage = options.storage || storageService;
  const state = await storage.loadAllState();
  const history = await storage.getStudyHistory(500);

  // Normalize and clean collections
  const rawDocuments = Array.isArray(state.documents) ? state.documents : [];
  const rawSubjects = Array.isArray(state.subjects) ? state.subjects : [];
  const rawSummaries = state.summaries || {};
  const rawFlashcards = state.flashcardDecks || {};
  const rawFlashcardStudyState = state.flashcardStudyState || {};
  const rawQuizzes = state.quizzes || {};
  const rawQuizAttempts = state.quizAttempts || {};
  const rawScopedChats = state.scopedChats || {};

  const cleanDocuments = rawDocuments.map(d => sanitizeEntity({
    id: d.id,
    name: d.name,
    size: d.size || 0,
    pageCount: d.pageCount || 1,
    subjectId: d.subjectId,
    subjectName: d.subjectName,
    fullText: d.fullText || "",
    chunks: Array.isArray(d.chunks) ? d.chunks : [],
    uploadedAt: d.uploadedAt,
    status: d.status || "ready"
  }));

  const cleanSubjects = rawSubjects.map(s => sanitizeEntity({
    id: s.id,
    name: s.name,
    documentIds: Array.isArray(s.documentIds) ? s.documentIds : [],
    createdAt: s.createdAt
  }));

  const cleanHistory = (Array.isArray(history) ? history : []).map(h => sanitizeEntity({
    id: h.id,
    type: h.type,
    subjectId: h.subjectId,
    documentId: h.documentId,
    title: h.title,
    score: h.score,
    percentage: h.percentage,
    timestamp: h.timestamp
  }));

  const backupData = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: {
      name: "ASTRA AI",
      version: "1.0.0"
    },
    documents: cleanDocuments,
    subjects: cleanSubjects,
    summaries: sanitizeEntity(rawSummaries),
    flashcardDecks: sanitizeEntity(rawFlashcards),
    flashcardStudyState: sanitizeEntity(rawFlashcardStudyState),
    quizzes: sanitizeEntity(rawQuizzes),
    quizAttempts: sanitizeEntity(rawQuizAttempts),
    scopedChats: sanitizeEntity(rawScopedChats),
    studyHistory: cleanHistory
  };

  return backupData;
}

/**
 * Format and trigger a browser file download of the backup payload
 * 
 * @param {Object} backupData 
 * @returns {string} Suggested filename
 */
export function downloadBackupFile(backupData) {
  if (!backupData || typeof backupData !== "object") {
    throw new Error("Invalid backup data provided for download.");
  }

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  const datePart = new Date().toISOString().split("T")[0];
  const filename = `ASTRA_backup_${datePart}.json`;

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return filename;
}

/**
 * Safely parse untrusted JSON input
 * 
 * @param {string} jsonString 
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
export function parseBackupJson(jsonString) {
  if (!jsonString || typeof jsonString !== "string") {
    return { success: false, error: "Empty or invalid backup file contents." };
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { success: false, error: "Backup file root must be a JSON object." };
    }
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: `Malformed JSON: ${err.message}` };
  }
}

/**
 * Validate backup format, supported version, and structural integrity
 * 
 * @param {Object} data - Parsed backup object
 * @returns {{ isValid: boolean, error?: string, warnings: string[] }}
 */
export function validateBackup(data) {
  const warnings = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { isValid: false, error: "Invalid ASTRA backup file: Root must be an object.", warnings };
  }

  // 1. Format check
  if (data.format !== BACKUP_FORMAT) {
    return {
      isValid: false,
      error: `Invalid backup format: Expected '${BACKUP_FORMAT}', received '${data.format || "unknown"}'.`,
      warnings
    };
  }

  // 2. Version check
  if (data.version !== BACKUP_VERSION) {
    return {
      isValid: false,
      error: `This ASTRA backup was created by a newer or unsupported version (version ${data.version}). Supported version: ${BACKUP_VERSION}.`,
      warnings
    };
  }

  // 3. Collection type checks
  if (data.documents !== undefined && !Array.isArray(data.documents)) {
    return { isValid: false, error: "Invalid backup: 'documents' must be an array.", warnings };
  }
  if (data.subjects !== undefined && !Array.isArray(data.subjects)) {
    return { isValid: false, error: "Invalid backup: 'subjects' must be an array.", warnings };
  }
  if (data.studyHistory !== undefined && !Array.isArray(data.studyHistory)) {
    warnings.push("'studyHistory' is not an array, skipping history events.");
  }
  if (data.summaries !== undefined && typeof data.summaries !== "object") {
    warnings.push("'summaries' is not an object, skipping summaries.");
  }
  if (data.flashcardDecks !== undefined && typeof data.flashcardDecks !== "object") {
    warnings.push("'flashcardDecks' is not an object, skipping flashcards.");
  }
  if (data.quizzes !== undefined && typeof data.quizzes !== "object") {
    warnings.push("'quizzes' is not an object, skipping quizzes.");
  }

  return { isValid: true, warnings };
}

/**
 * Generate preview metrics and statistics from a backup object
 * 
 * @param {Object} data - Validated backup object
 * @returns {Object} Preview summary
 */
export function previewBackup(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const documents = Array.isArray(data.documents) ? data.documents : [];
  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  const summaries = data.summaries && typeof data.summaries === "object" ? data.summaries : {};
  const flashcards = data.flashcardDecks && typeof data.flashcardDecks === "object" ? data.flashcardDecks : {};
  const quizzes = data.quizzes && typeof data.quizzes === "object" ? data.quizzes : {};
  const quizAttempts = data.quizAttempts && typeof data.quizAttempts === "object" ? data.quizAttempts : {};
  const chats = data.scopedChats && typeof data.scopedChats === "object" ? data.scopedChats : {};
  const history = Array.isArray(data.studyHistory) ? data.studyHistory : [];

  let totalFlashcardsCount = 0;
  for (const deck of Object.values(flashcards)) {
    if (deck && Array.isArray(deck.cards)) {
      totalFlashcardsCount += deck.cards.length;
    } else if (deck && typeof deck.count === "number") {
      totalFlashcardsCount += deck.count;
    }
  }

  let totalChatMessagesCount = 0;
  for (const msgs of Object.values(chats)) {
    if (Array.isArray(msgs)) {
      totalChatMessagesCount += msgs.length;
    }
  }

  let totalQuizQuestionsCount = 0;
  for (const q of Object.values(quizzes)) {
    if (q && Array.isArray(q.questions)) {
      totalQuizQuestionsCount += q.questions.length;
    }
  }

  return {
    format: data.format || BACKUP_FORMAT,
    version: data.version || 1,
    exportedAt: data.exportedAt || null,
    documentCount: documents.length,
    subjectCount: subjects.length,
    summaryCount: Object.keys(summaries).length,
    flashcardDeckCount: Object.keys(flashcards).length,
    totalFlashcards: totalFlashcardsCount,
    quizCount: Object.keys(quizzes).length,
    quizQuestionsCount: totalQuizQuestionsCount,
    quizAttemptCount: Object.keys(quizAttempts).length,
    chatScopeCount: Object.keys(chats).length,
    chatMessageCount: totalChatMessagesCount,
    historyCount: history.length
  };
}

/**
 * Check if two documents have identical content
 */
function isIdenticalDocument(docA, docB) {
  if (!docA || !docB) return false;
  if (docA.name === docB.name && docA.fullText && docB.fullText && docA.fullText === docB.fullText) {
    return true;
  }
  if (docA.name === docB.name && docA.size && docB.size && docA.size === docB.size && docA.pageCount === docB.pageCount) {
    return true;
  }
  return false;
}

/**
 * Restore an ASTRA backup in Replace or Merge mode
 * 
 * @param {Object} backupData - Validated backup object
 * @param {Object} options - { mode: 'merge' | 'replace', storage }
 * @returns {Promise<{ success: boolean, stats: Object, restoredState: Object }>}
 */
export async function restoreBackup(backupData, options = {}) {
  const mode = options.mode === "replace" ? "replace" : "merge";
  const storage = options.storage || storageService;

  const validation = validateBackup(backupData);
  if (!validation.isValid) {
    throw new Error(validation.error || "Backup validation failed.");
  }

  const incomingDocs = Array.isArray(backupData.documents) ? backupData.documents : [];
  const incomingSubjects = Array.isArray(backupData.subjects) ? backupData.subjects : [];
  const incomingSummaries = backupData.summaries && typeof backupData.summaries === "object" ? backupData.summaries : {};
  const incomingFlashcards = backupData.flashcardDecks && typeof backupData.flashcardDecks === "object" ? backupData.flashcardDecks : {};
  const incomingFlashcardStudy = backupData.flashcardStudyState && typeof backupData.flashcardStudyState === "object" ? backupData.flashcardStudyState : {};
  const incomingQuizzes = backupData.quizzes && typeof backupData.quizzes === "object" ? backupData.quizzes : {};
  const incomingQuizAttempts = backupData.quizAttempts && typeof backupData.quizAttempts === "object" ? backupData.quizAttempts : {};
  const incomingScopedChats = backupData.scopedChats && typeof backupData.scopedChats === "object" ? backupData.scopedChats : {};
  const incomingHistory = Array.isArray(backupData.studyHistory) ? backupData.studyHistory : [];

  let finalDocs;
  let finalSubjects;
  let finalSummaries;
  let finalFlashcards;
  let finalFlashcardStudy;
  let finalQuizzes;
  let finalQuizAttempts;
  let finalScopedChats;
  let finalHistory;

  const docIdMapping = new Map(); // oldDocId -> newDocId

  if (mode === "replace") {
    // -------------------------------------------------------------
    // REPLACE MODE: Clean wipe and replace with backup contents
    // -------------------------------------------------------------
    await storage.clearAll();

    finalDocs = incomingDocs.map(d => ({ ...d }));
    finalSubjects = incomingSubjects.map(s => ({ ...s }));
    finalSummaries = { ...incomingSummaries };
    finalFlashcards = { ...incomingFlashcards };
    finalFlashcardStudy = { ...incomingFlashcardStudy };
    finalQuizzes = { ...incomingQuizzes };
    finalQuizAttempts = { ...incomingQuizAttempts };
    finalScopedChats = { ...incomingScopedChats };
    finalHistory = incomingHistory.map(h => ({ ...h }));

  } else {
    // -------------------------------------------------------------
    // MERGE MODE: Retain current data and intelligently merge backup
    // -------------------------------------------------------------
    const current = await storage.loadAllState();
    const currentHistory = await storage.getStudyHistory(1000);

    const existingDocMap = new Map((current.documents || []).map(d => [d.id, d]));
    const existingSubjectMap = new Map((current.subjects || []).map(s => [s.id, s]));

    finalDocs = [...(current.documents || [])];
    finalSubjects = (current.subjects || []).map(s => ({ ...s, documentIds: [...(s.documentIds || [])] }));
    finalSummaries = { ...(current.summaries || {}) };
    finalFlashcards = { ...(current.flashcardDecks || {}) };
    finalFlashcardStudy = { ...(current.flashcardStudyState || {}) };
    finalQuizzes = { ...(current.quizzes || {}) };
    finalQuizAttempts = { ...(current.quizAttempts || {}) };
    finalScopedChats = { ...(current.scopedChats || {}) };
    finalHistory = [...currentHistory];

    // 1. Merge Documents
    for (const doc of incomingDocs) {
      if (!doc || !doc.id) continue;

      if (existingDocMap.has(doc.id)) {
        const existing = existingDocMap.get(doc.id);
        if (isIdenticalDocument(existing, doc)) {
          // Identical document already exists: use existing ID
          docIdMapping.set(doc.id, doc.id);
        } else {
          // Conflicting ID with different content: assign new conflict-safe ID
          const newDocId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          docIdMapping.set(doc.id, newDocId);
          const clonedDoc = {
            ...doc,
            id: newDocId,
            name: `${doc.name} (Imported)`
          };
          finalDocs.push(clonedDoc);
          existingDocMap.set(newDocId, clonedDoc);
        }
      } else {
        // Document does not exist yet: insert directly
        docIdMapping.set(doc.id, doc.id);
        finalDocs.push({ ...doc });
        existingDocMap.set(doc.id, doc);
      }
    }

    // 2. Merge Subjects
    for (const subj of incomingSubjects) {
      if (!subj || !subj.id) continue;

      // Remap documentIds for this subject
      const remappedDocIds = (subj.documentIds || [])
        .map(id => docIdMapping.get(id) || id)
        .filter(id => existingDocMap.has(id));

      if (existingSubjectMap.has(subj.id)) {
        const targetSubj = finalSubjects.find(s => s.id === subj.id);
        if (targetSubj) {
          const mergedDocIds = Array.from(new Set([...(targetSubj.documentIds || []), ...remappedDocIds]));
          targetSubj.documentIds = mergedDocIds;
        }
      } else {
        // Match by subject name if ID is different
        const nameMatch = finalSubjects.find(s => s.name.toLowerCase() === subj.name.toLowerCase());
        if (nameMatch) {
          const mergedDocIds = Array.from(new Set([...(nameMatch.documentIds || []), ...remappedDocIds]));
          nameMatch.documentIds = mergedDocIds;
        } else {
          finalSubjects.push({
            ...subj,
            documentIds: remappedDocIds
          });
          existingSubjectMap.set(subj.id, subj);
        }
      }
    }

    // 3. Remap helper for scope keys
    const remapScopeKey = (scopeKey) => {
      if (!scopeKey) return scopeKey;
      if (scopeKey.startsWith("doc_")) {
        const rawId = scopeKey.slice(4);
        const mappedId = docIdMapping.get(rawId);
        return mappedId ? `doc_${mappedId}` : scopeKey;
      }
      return scopeKey;
    };

    // 4. Merge Summaries
    for (const [key, val] of Object.entries(incomingSummaries)) {
      const mappedKey = remapScopeKey(key);
      if (!finalSummaries[mappedKey]) {
        finalSummaries[mappedKey] = val;
      }
    }

    // 5. Merge Flashcards
    for (const [key, val] of Object.entries(incomingFlashcards)) {
      const mappedKey = remapScopeKey(key);
      if (!finalFlashcards[mappedKey]) {
        finalFlashcards[mappedKey] = val;
      }
    }
    for (const [key, val] of Object.entries(incomingFlashcardStudy)) {
      const mappedKey = remapScopeKey(key);
      if (!finalFlashcardStudy[mappedKey]) {
        finalFlashcardStudy[mappedKey] = val;
      }
    }

    // 6. Merge Quizzes & Attempts
    for (const [key, val] of Object.entries(incomingQuizzes)) {
      const mappedKey = remapScopeKey(key);
      if (!finalQuizzes[mappedKey]) {
        finalQuizzes[mappedKey] = val;
      }
    }
    for (const [key, val] of Object.entries(incomingQuizAttempts)) {
      const mappedKey = remapScopeKey(key);
      if (!finalQuizAttempts[mappedKey]) {
        finalQuizAttempts[mappedKey] = val;
      }
    }

    // 7. Merge Scoped Chats
    for (const [key, val] of Object.entries(incomingScopedChats)) {
      const mappedKey = remapScopeKey(key);
      if (!finalScopedChats[mappedKey]) {
        finalScopedChats[mappedKey] = val;
      } else if (Array.isArray(val)) {
        // Append messages without duplicates
        const existingMessages = finalScopedChats[mappedKey] || [];
        const getMsgKey = (m) => `${m.sender || ''}_${(m.text || m.content || '').trim()}`;
        const seenKeys = new Set(existingMessages.map(getMsgKey));
        const newMessages = val.filter(m => !seenKeys.has(getMsgKey(m)));
        finalScopedChats[mappedKey] = [...existingMessages, ...newMessages];
      }
    }

    // 8. Merge Study History
    const existingHistoryIds = new Set(finalHistory.map(h => h.id));
    for (const item of incomingHistory) {
      if (item && item.id && !existingHistoryIds.has(item.id)) {
        finalHistory.push({
          ...item,
          documentId: item.documentId ? (docIdMapping.get(item.documentId) || item.documentId) : null
        });
        existingHistoryIds.add(item.id);
      }
    }
  }

  // -------------------------------------------------------------
  // Relationship Integrity Enforcement
  // -------------------------------------------------------------
  const validDocIdSet = new Set(finalDocs.map(d => d.id));
  const validSubjectIdSet = new Set(finalSubjects.map(s => s.id));

  // Ensure documents reference valid subjects
  for (const doc of finalDocs) {
    if (!doc.subjectId || !validSubjectIdSet.has(doc.subjectId)) {
      // If subject is invalid or missing, associate with first valid subject or 'general'
      const fallbackSubject = finalSubjects[0];
      if (fallbackSubject) {
        doc.subjectId = fallbackSubject.id;
        doc.subjectName = fallbackSubject.name;
        if (!fallbackSubject.documentIds.includes(doc.id)) {
          fallbackSubject.documentIds.push(doc.id);
        }
      } else {
        doc.subjectId = "general";
        doc.subjectName = "General Study";
      }
    }
  }

  // Ensure subjects only reference valid documents
  for (const subj of finalSubjects) {
    subj.documentIds = (subj.documentIds || []).filter(id => validDocIdSet.has(id));
  }

  // Remove empty subjects that have no documents
  finalSubjects = finalSubjects.filter(s => s.documentIds.length > 0);

  // -------------------------------------------------------------
  // Persist Clean Data to Storage
  // -------------------------------------------------------------
  for (const doc of finalDocs) {
    await storage.saveDocument(doc);
  }
  for (const subj of finalSubjects) {
    await storage.saveSubject(subj);
  }
  for (const [key, val] of Object.entries(finalSummaries)) {
    await storage.saveSummary(key, val);
  }
  for (const [key, val] of Object.entries(finalFlashcards)) {
    await storage.saveFlashcards(key, val, finalFlashcardStudy[key] || null);
  }
  for (const [key, val] of Object.entries(finalQuizzes)) {
    await storage.saveQuiz(key, val, finalQuizAttempts[key] || null);
  }
  for (const [key, val] of Object.entries(finalScopedChats)) {
    await storage.saveChat(key, val);
  }
  for (const h of finalHistory) {
    await storage.recordStudyHistory(h);
  }

  const restoredState = {
    documents: finalDocs,
    subjects: finalSubjects,
    summaries: finalSummaries,
    flashcardDecks: finalFlashcards,
    flashcardStudyState: finalFlashcardStudy,
    quizzes: finalQuizzes,
    quizAttempts: finalQuizAttempts,
    scopedChats: finalScopedChats,
    studyHistory: finalHistory
  };

  return {
    success: true,
    stats: {
      mode,
      documentsCount: finalDocs.length,
      subjectsCount: finalSubjects.length,
      summariesCount: Object.keys(finalSummaries).length,
      flashcardDecksCount: Object.keys(finalFlashcards).length,
      quizzesCount: Object.keys(finalQuizzes).length,
      historyCount: finalHistory.length
    },
    restoredState
  };
}
