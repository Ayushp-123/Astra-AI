/**
 * Context Selection Service
 * 
 * Performs deterministic, lightweight relevance scoring on document page chunks
 * to extract the most relevant context for a user's question within the active
 * subject or document scope.
 */

// Common English stopwords to ignore when extracting query keywords
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "explain", "few", "for", "from", "further", "had", "hadn't",
  "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's",
  "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
  "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
  "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "ought", "our", "ours", "ourselves", "out", "over", "own", "please", "same",
  "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
  "some", "such", "tell", "than", "that", "that's", "the", "their", "theirs",
  "them", "themselves", "then", "there", "there's", "these", "they", "they'd",
  "they'll", "they're", "they've", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
  "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
  "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
  "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
  "your", "yours", "yourself", "yourselves", "notes", "give", "describe"
]);

/**
 * Extract meaningful search keywords from a user query
 */
export function extractKeywords(query = "") {
  if (!query || typeof query !== "string") return [];

  // Clean and normalize terms
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter(term => term.length >= 2 && !STOP_WORDS.has(term));

  return [...new Set(terms)];
}

/**
 * Retrieve the most relevant chunks from active documents for a given query
 * 
 * @param {string} query - Student's question
 * @param {Array} documents - Active document objects (scoped to selected doc or subject)
 * @param {Object} options - Configuration options
 * @returns {Object} Structured context payload
 */
export function retrieveRelevantContext(query, documents = [], options = {}) {
  const maxChars = options.maxChars || 6000;

  if (!Array.isArray(documents) || documents.length === 0) {
    return {
      contextText: "",
      sources: [],
      selectedChunksCount: 0,
      totalChunksAvailable: 0,
      hasMatchingKeywords: false,
      hasReadableNotes: false
    };
  }

  // Flatten all chunks with metadata
  const allChunks = [];
  let totalRawText = "";

  for (const doc of documents) {
    if (!doc) continue;

    if (Array.isArray(doc.chunks) && doc.chunks.length > 0) {
      for (const chunk of doc.chunks) {
        if (chunk && chunk.text && chunk.text.trim().length > 0) {
          allChunks.push({
            docId: doc.id,
            docName: doc.name,
            subjectName: doc.subjectName,
            page: chunk.page,
            text: chunk.text.trim()
          });
          totalRawText += chunk.text + " ";
        }
      }
    } else if (doc.fullText && doc.fullText.trim().length > 0) {
      // Fallback if chunks are not available
      allChunks.push({
        docId: doc.id,
        docName: doc.name,
        subjectName: doc.subjectName,
        page: 1,
        text: doc.fullText.trim()
      });
      totalRawText += doc.fullText + " ";
    }
  }

  if (allChunks.length === 0 || totalRawText.trim().length === 0) {
    return {
      contextText: "",
      sources: [],
      selectedChunksCount: 0,
      totalChunksAvailable: 0,
      hasMatchingKeywords: false,
      hasReadableNotes: false
    };
  }

  const keywords = extractKeywords(query);
  const normalizedQuery = query.toLowerCase().trim();

  // Score each chunk
  const scoredChunks = allChunks.map((chunk) => {
    const chunkTextLower = chunk.text.toLowerCase();
    const docNameLower = (chunk.docName || "").toLowerCase();
    let score = 0;

    // 1. Exact query phrase match
    if (normalizedQuery.length > 3 && chunkTextLower.includes(normalizedQuery)) {
      score += 15;
    }

    // 2. Keyword frequency matches
    for (const kw of keywords) {
      let occurrences = 0;
      let pos = chunkTextLower.indexOf(kw);
      while (pos !== -1) {
        occurrences++;
        pos = chunkTextLower.indexOf(kw, pos + kw.length);
      }
      if (occurrences > 0) {
        score += occurrences * 3;
      }

      // Keyword match in document name
      if (docNameLower.includes(kw)) {
        score += 4;
      }
    }

    return {
      ...chunk,
      score
    };
  });

  // Filter chunks with positive relevance score
  const matchedChunks = scoredChunks.filter(c => c.score > 0);
  matchedChunks.sort((a, b) => b.score - a.score);

  const selected = [];
  let currentLength = 0;
  const hasMatchingKeywords = matchedChunks.length > 0;

  if (hasMatchingKeywords) {
    for (const chunk of matchedChunks) {
      if (currentLength + chunk.text.length <= maxChars || selected.length === 0) {
        selected.push(chunk);
        currentLength += chunk.text.length;
      }
    }
  } else {
    // Safe fallback: select representative chunks in order (up to budget)
    for (const chunk of allChunks) {
      if (currentLength + chunk.text.length <= maxChars || selected.length === 0) {
        selected.push(chunk);
        currentLength += chunk.text.length;
      }
    }
  }

  // Sort selected chunks by document name and page number for reading flow
  selected.sort((a, b) => {
    if (a.docName !== b.docName) return a.docName.localeCompare(b.docName);
    return a.page - b.page;
  });

  // Format context string with structured headers
  const contextText = selected
    .map(c => `[Document: ${c.docName} | Page: ${c.page}]\n${c.text}`)
    .join("\n\n---\n\n");

  // Format sources summary
  const sources = selected.map(c => ({
    docId: c.docId,
    docName: c.docName,
    page: c.page,
    snippet: c.text.slice(0, 100) + (c.text.length > 100 ? "..." : "")
  }));

  return {
    contextText,
    sources,
    selectedChunksCount: selected.length,
    totalChunksAvailable: allChunks.length,
    hasMatchingKeywords,
    hasReadableNotes: true
  };
}

/**
 * Retrieve representative summary context across active documents
 * 
 * @param {Array} documents - Active document objects
 * @param {Object} options - Configuration options
 * @returns {Object} Structured context payload
 */
export function retrieveSummaryContext(documents = [], options = {}) {
  const maxChars = options.maxChars || 8000;

  if (!Array.isArray(documents) || documents.length === 0) {
    return {
      contextText: "",
      sources: [],
      hasReadableNotes: false
    };
  }

  const selectedChunks = [];
  let totalLength = 0;

  for (const doc of documents) {
    if (!doc) continue;

    const docChunks = Array.isArray(doc.chunks) && doc.chunks.length > 0
      ? doc.chunks.filter(c => c && c.text && c.text.trim().length > 0)
      : (doc.fullText ? [{ page: 1, text: doc.fullText.trim() }] : []);

    if (docChunks.length === 0) continue;

    // Representative sampling: if doc has many pages, pick distributed pages
    const sampledForDoc = docChunks.length <= 6
      ? docChunks
      : (() => {
          const step = Math.floor(docChunks.length / 5);
          const indices = new Set([0, 1, step * 2, step * 3, docChunks.length - 1]);
          return docChunks.filter((_, idx) => indices.has(idx));
        })();

    for (const chunk of sampledForDoc) {
      if (totalLength + chunk.text.length <= maxChars || selectedChunks.length === 0) {
        selectedChunks.push({
          docId: doc.id,
          docName: doc.name,
          page: chunk.page,
          text: chunk.text.trim()
        });
        totalLength += chunk.text.length;
      }
    }
  }

  if (selectedChunks.length === 0) {
    return {
      contextText: "",
      sources: [],
      hasReadableNotes: false
    };
  }

  const contextText = selectedChunks
    .map(c => `[Document: ${c.docName} | Page: ${c.page}]\n${c.text}`)
    .join("\n\n---\n\n");

  const sources = selectedChunks.map(c => ({
    docId: c.docId,
    docName: c.docName,
    page: c.page,
    snippet: c.text.slice(0, 100) + (c.text.length > 100 ? "..." : "")
  }));

  return {
    contextText,
    sources,
    hasReadableNotes: true
  };
}

/**
 * Retrieve representative context specifically for flashcard deck generation
 * 
 * @param {Array} documents - Active document objects
 * @param {Object} options - Configuration options
 * @returns {Object} Structured context payload
 */
export function retrieveFlashcardsContext(documents = [], options = {}) {
  return retrieveSummaryContext(documents, { maxChars: options.maxChars || 8500 });
}

/**
 * Retrieve representative context specifically for practice quiz generation
 * 
 * @param {Array} documents - Active document objects
 * @param {Object} options - Configuration options
 * @returns {Object} Structured context payload
 */
export function retrieveQuizContext(documents = [], options = {}) {
  return retrieveSummaryContext(documents, { maxChars: options.maxChars || 9000 });
}



