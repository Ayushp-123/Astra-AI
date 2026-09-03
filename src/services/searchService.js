import Fuse from 'fuse.js';

/**
 * Intelligent Study Search Service
 * 
 * Provides client-side indexing, exact keyword matching, phrase matching,
 * and typo-tolerant fuzzy search across document page chunks.
 */

// Cache the search index to avoid re-indexing on every keystroke
let cachedDocumentsRef = null;
let cachedSearchUnits = [];
let cachedFuseInstance = null;

export function resetSearchIndexCache() {
  cachedDocumentsRef = null;
  cachedSearchUnits = [];
  cachedFuseInstance = null;
}

/**
 * Build flat searchable chunk units from documents
 * 
 * @param {Array} documents - Normalized documents from store
 * @returns {Array} Searchable units
 */
export function buildSearchUnits(documents = []) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  const units = [];

  for (const doc of documents) {
    if (!doc) continue;

    if (Array.isArray(doc.chunks) && doc.chunks.length > 0) {
      doc.chunks.forEach((chunk, idx) => {
        if (chunk && chunk.text && chunk.text.trim().length > 0) {
          units.push({
            id: `${doc.id}_p${chunk.page || 1}_${idx}`,
            documentId: doc.id,
            documentName: doc.name || 'Untitled Document',
            subjectId: doc.subjectId || 'general',
            subjectName: doc.subjectName || 'General',
            page: chunk.page || 1,
            text: chunk.text.trim()
          });
        }
      });
    } else if (doc.fullText && doc.fullText.trim().length > 0) {
      units.push({
        id: `${doc.id}_p1_0`,
        documentId: doc.id,
        documentName: doc.name || 'Untitled Document',
        subjectId: doc.subjectId || 'general',
        subjectName: doc.subjectName || 'General',
        page: 1,
        text: doc.fullText.trim()
      });
    }
  }

  return units;
}

/**
 * Get or create Fuse instance for documents
 */
function getFuseInstance(documents = []) {
  if (cachedDocumentsRef === documents && cachedFuseInstance) {
    return { fuse: cachedFuseInstance, units: cachedSearchUnits };
  }

  const units = buildSearchUnits(documents);
  const fuseOptions = {
    keys: [
      { name: 'documentName', weight: 0.35 },
      { name: 'subjectName', weight: 0.2 },
      { name: 'text', weight: 0.65 }
    ],
    threshold: 0.4, // Allows fuzzy matches for typos like "normlization" -> "normalization"
    ignoreLocation: true,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    useExtendedSearch: false
  };

  const fuse = new Fuse(units, fuseOptions);

  cachedDocumentsRef = documents;
  cachedSearchUnits = units;
  cachedFuseInstance = fuse;

  return { fuse, units };
}

/**
 * Extract a concise snippet around matched keywords
 * 
 * @param {string} text - Full chunk text
 * @param {string} query - Search term
 * @param {number} radius - Character context radius
 * @returns {string} Formatted snippet with ellipsis
 */
export function extractSnippet(text = "", query = "", radius = 70) {
  if (!text) return "";
  if (!query) return text.slice(0, 140) + (text.length > 140 ? "..." : "");

  const textLower = text.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);

  let matchIndex = -1;
  let matchedLength = query.length;

  // 1. Try exact phrase match
  const phraseIndex = textLower.indexOf(query.toLowerCase().trim());
  if (phraseIndex !== -1) {
    matchIndex = phraseIndex;
    matchedLength = query.trim().length;
  } else {
    // 2. Try individual terms
    for (const term of terms) {
      const idx = textLower.indexOf(term);
      if (idx !== -1) {
        matchIndex = idx;
        matchedLength = term.length;
        break;
      }
    }
  }

  if (matchIndex === -1) {
    return text.slice(0, 140) + (text.length > 140 ? "..." : "");
  }

  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + matchedLength + radius);

  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/**
 * Perform intelligent study search across documents
 * 
 * @param {string} query - User search term
 * @param {Array} documents - Normalized documents array
 * @param {Object} options - { limit: number, subjectId?: string }
 * @returns {Array<Object>} Ranked search results
 */
export function searchStudyMaterial(query = "", documents = [], options = {}) {
  const trimmedQuery = (query || "").trim();
  if (!trimmedQuery || !Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  const limit = options.limit || 8;
  const { fuse, units } = getFuseInstance(documents);

  const queryLower = trimmedQuery.toLowerCase();
  const searchTerms = queryLower.split(/\s+/).filter(t => t.length >= 2);

  // 1. Perform Fuse search
  const fuseResults = fuse.search(trimmedQuery);

  // 2. Exact match boost: check for direct substring matches
  const exactMatches = [];
  const fuzzyMatches = [];

  for (const result of fuseResults) {
    const item = result.item;
    if (options.subjectId && item.subjectId !== options.subjectId) {
      continue;
    }

    const textLower = item.text.toLowerCase();
    const docNameLower = item.documentName.toLowerCase();

    const isExactPhrase = textLower.includes(queryLower) || docNameLower.includes(queryLower);
    const hasAllTerms = searchTerms.every(t => textLower.includes(t) || docNameLower.includes(t));

    let score = result.score !== undefined ? result.score : 0.5;

    // Boost exact matches (lower score in Fuse means closer match)
    if (isExactPhrase) {
      score *= 0.1;
    } else if (hasAllTerms) {
      score *= 0.3;
    }

    const matchedTermsSet = new Set(searchTerms);
    if (result.matches) {
      result.matches.forEach(m => {
        if (m.value) {
          searchTerms.forEach(term => {
            if (m.value.toLowerCase().includes(term)) {
              matchedTermsSet.add(term);
            }
          });
        }
      });
    }

    const searchResultItem = {
      id: item.id,
      documentId: item.documentId,
      documentName: item.documentName,
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      page: item.page,
      snippet: extractSnippet(item.text, trimmedQuery),
      matchedTerms: Array.from(matchedTermsSet),
      score
    };

    if (isExactPhrase || hasAllTerms) {
      exactMatches.push(searchResultItem);
    } else {
      fuzzyMatches.push(searchResultItem);
    }
  }

  // 3. If exact matches directly in units were missed by Fuse (e.g., special characters)
  if (exactMatches.length === 0) {
    for (const unit of units) {
      if (options.subjectId && unit.subjectId !== options.subjectId) continue;

      const textLower = unit.text.toLowerCase();
      const docNameLower = unit.documentName.toLowerCase();

      if (textLower.includes(queryLower) || docNameLower.includes(queryLower)) {
        if (!exactMatches.some(m => m.id === unit.id)) {
          exactMatches.push({
            id: unit.id,
            documentId: unit.documentId,
            documentName: unit.documentName,
            subjectId: unit.subjectId,
            subjectName: unit.subjectName,
            page: unit.page,
            snippet: extractSnippet(unit.text, trimmedQuery),
            matchedTerms: searchTerms,
            score: 0.05
          });
        }
      }
    }
  }

  // 4. Combine and sort results
  const combined = [...exactMatches, ...fuzzyMatches];
  combined.sort((a, b) => a.score - b.score);

  // Remove duplicates by ID
  const seenIds = new Set();
  const uniqueResults = [];

  for (const item of combined) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueResults.push(item);
    }
    if (uniqueResults.length >= limit) break;
  }

  return uniqueResults;
}
