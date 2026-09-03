/**
 * ASTRA AI Service (Client-Side)
 * 
 * Communicates with the secure ASTRA backend AI proxy (/api/ai/chat)
 * for grounded study assistant completions, summaries, flashcards, and quizzes.
 * API keys and external AI URLs are never exposed to the browser.
 */

const AI_API_ENDPOINT = "/api/ai/chat";

/**
 * Centralized client-side request helper to secure backend proxy
 */
async function requestAiCompletion({ task, messages, temperature = 0.3, max_tokens = 2000 }) {
  const response = await fetch(AI_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      task,
      messages,
      temperature,
      max_tokens
    })
  });

  if (!response.ok) {
    let errMessage = "AI service request failed.";
    let errCode = "HTTP_ERROR";
    try {
      const errData = await response.json();
      if (errData?.error?.message) {
        errMessage = errData.error.message;
      }
      if (errData?.error?.code) {
        errCode = errData.error.code;
      }
    } catch {
      // Ignore JSON parse error on non-200
    }

    const err = new Error(errMessage);
    err.status = response.status;
    err.code = errCode;
    throw err;
  }

  const result = await response.json();
  return result?.data?.content || "";
}

/**
 * Determine the grounding status of an AI answer
 */
function analyzeGroundingStatus(answerText = "", hasReadableNotes = true, hasMatchingKeywords = true) {
  if (!hasReadableNotes) {
    return "not_in_notes";
  }

  const lower = answerText.toLowerCase();

  const notInNotesPhrases = [
    "not covered in your uploaded notes",
    "not found in the provided notes",
    "not present in your notes",
    "not in your uploaded material",
    "not mentioned in your notes",
    "not included in your notes",
    "outside the provided study material",
    "general background knowledge"
  ];

  const hasNotInNotesPhrase = notInNotesPhrases.some(phrase => lower.includes(phrase));

  if (hasNotInNotesPhrase) {
    return "not_in_notes";
  }

  if (hasMatchingKeywords) {
    return "grounded";
  }

  return "partially_grounded";
}

/**
 * Ask ASTRA AI a grounded study question
 * 
 * @param {string} question - Student's question
 * @param {Object|string} contextData - Context result from contextService or raw text
 * @param {Object} options - { subjectName, docName }
 * @returns {Promise<{ answer: string, groundingStatus: string, sources: Array }>}
 */
export async function askAstra(question, contextData = {}, options = {}) {
  // Normalize context payload
  let contextText = "";
  let sources = [];
  let hasReadableNotes = true;
  let hasMatchingKeywords = false;

  if (typeof contextData === "string") {
    contextText = contextData.trim();
    hasReadableNotes = contextText.length > 0;
  } else if (typeof contextData === "object" && contextData !== null) {
    contextText = (contextData.contextText || "").trim();
    sources = contextData.sources || [];
    hasReadableNotes = contextData.hasReadableNotes !== false && contextText.length > 0;
    hasMatchingKeywords = !!contextData.hasMatchingKeywords;
  }

  // Guard: If there is no readable study material
  if (!hasReadableNotes || !contextText) {
    return {
      answer: "I don't have readable study material available for this subject or document yet. Please ensure you have uploaded text-based PDF lecture notes or slides to ask questions grounded in your course material.",
      groundingStatus: "not_in_notes",
      sources: []
    };
  }

  const subjectHeader = options.subjectName ? `ACTIVE SUBJECT: ${options.subjectName}` : "ACTIVE SUBJECT: General Study";
  const docHeader = options.docName ? `ACTIVE DOCUMENT: ${options.docName}` : "";

  const systemPrompt = `You are ASTRA AI, an intelligent, precise academic study assistant helping students understand and master their course material.

${subjectHeader}
${docHeader}

The provided STUDY MATERIAL is your primary source of truth.

CRITICAL INSTRUCTIONS:
1. Base your answer primarily and accurately on the provided STUDY MATERIAL.
2. If the user's question can be answered using the study material, explain it clearly, step-by-step, with academic clarity. Reference document names or page numbers where appropriate.
3. If the requested information is NOT present in the provided study material, explicitly state: "This topic is not covered in your uploaded notes." You may then provide a brief, helpful academic explanation, but you MUST clearly label it as general background knowledge not found in their notes.
4. Never invent facts or claim that information was in the notes when it was not.
5. Keep answers structured with clear headings or bullet points when helpful.

STUDY MATERIAL:
${contextText}`;

  try {
    const rawAnswer = await requestAiCompletion({
      task: "chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.2
    });

    if (!rawAnswer || rawAnswer.trim().length === 0) {
      return {
        answer: "ASTRA AI generated an empty response. Please try rephrasing your question.",
        groundingStatus: "not_in_notes",
        sources: []
      };
    }

    const groundingStatus = analyzeGroundingStatus(rawAnswer, hasReadableNotes, hasMatchingKeywords);

    return {
      answer: rawAnswer.trim(),
      groundingStatus,
      sources
    };
  } catch (err) {
    console.error("AI service error:", err.message);
    if (err.status === 401 || err.code === "AUTH_NOT_CONFIGURED" || err.code === "AUTH_ERROR") {
      return {
        answer: "AI service authentication is not configured on the server. Please ensure the backend server has the required API key configured.",
        groundingStatus: "not_in_notes",
        sources: []
      };
    }
    if (err.status === 429 || err.code === "RATE_LIMITED") {
      return {
        answer: "AI request rate limit reached. Please wait a few seconds and try again.",
        groundingStatus: "not_in_notes",
        sources: []
      };
    }
    return {
      answer: "ASTRA AI encountered an issue processing your request with the AI service. Please try again in a moment.",
      groundingStatus: "not_in_notes",
      sources: []
    };
  }
}

/**
 * Robustly extract and parse a JSON substring from AI output
 */
export function extractJsonPayload(text) {
  if (!text || typeof text !== "string") return null;

  // 1. Try markdown code block extraction
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to regex scanning
    }
  }

  // 2. Scan for outer JSON object/array
  const firstCurly = text.indexOf("{");
  const lastCurly = text.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly > firstCurly) {
    const candidate = text.substring(firstCurly, lastCurly + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Failed candidate
    }
  }

  // 3. Scan for outer JSON array
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = text.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Failed candidate
    }
  }

  return null;
}

/**
 * Validate and clean parsed summary payload
 */
export function parseSummaryResponse(rawText) {
  const json = extractJsonPayload(rawText);
  if (!json || typeof json !== "object") {
    // Fallback: Use raw text as short summary if JSON parsing fails
    return {
      shortSummary: typeof rawText === "string" ? rawText.slice(0, 500) : "Summary unavailable.",
      keyConcepts: [],
      importantDefinitions: [],
      importantPoints: [],
      examPoints: []
    };
  }

  const shortSummary = typeof json.shortSummary === "string" && json.shortSummary.trim().length > 0
    ? json.shortSummary.trim()
    : "Comprehensive study summary derived from uploaded notes.";

  const keyConcepts = Array.isArray(json.keyConcepts)
    ? json.keyConcepts.map(c => String(c).trim()).filter(Boolean)
    : [];

  const importantDefinitions = Array.isArray(json.importantDefinitions)
    ? json.importantDefinitions
        .filter(d => d && (d.term || d.name) && (d.definition || d.meaning || d.def))
        .map(d => ({
          term: String(d.term || d.name).trim(),
          definition: String(d.definition || d.meaning || d.def).trim()
        }))
    : [];

  const importantPoints = Array.isArray(json.importantPoints)
    ? json.importantPoints.map(p => String(p).trim()).filter(Boolean)
    : [];

  const examPoints = Array.isArray(json.examPoints)
    ? json.examPoints.map(p => String(p).trim()).filter(Boolean)
    : [];

  return {
    shortSummary,
    keyConcepts,
    importantDefinitions,
    importantPoints,
    examPoints
  };
}

/**
 * Generate a structured academic study summary
 */
export async function generateStudySummary(contextData = {}, options = {}) {
  let contextText = "";
  let sources = [];
  let hasReadableNotes = true;

  if (typeof contextData === "string") {
    contextText = contextData.trim();
    hasReadableNotes = contextText.length > 0;
  } else if (typeof contextData === "object" && contextData !== null) {
    contextText = (contextData.contextText || "").trim();
    sources = contextData.sources || [];
    hasReadableNotes = contextData.hasReadableNotes !== false && contextText.length > 0;
  }

  if (!hasReadableNotes || !contextText) {
    return {
      summary: null,
      error: "No readable study material found to summarize. Please upload text-based PDF notes."
    };
  }

  const subjectHeader = options.subjectName ? `SUBJECT: ${options.subjectName}` : "SUBJECT: Academic Course";
  const docHeader = options.docName ? `DOCUMENT: ${options.docName}` : "SCOPE: All Subject Notes";

  const systemPrompt = `You are ASTRA AI, an expert academic synthesizer. Create a rigorous, highly structured revision summary based ONLY on the provided study material.

${subjectHeader}
${docHeader}

CRITICAL RULES:
1. Ground every point strictly in the provided study material.
2. Return ONLY a valid JSON object matching the schema below.
3. Do not include introductory conversational text outside the JSON.

SCHEMA:
{
  "shortSummary": "A clear, high-yield overview paragraph (3-5 sentences).",
  "keyConcepts": ["Major Concept 1", "Major Concept 2", "Major Concept 3"],
  "importantDefinitions": [
    { "term": "Term Name", "definition": "Exact concise definition from notes" }
  ],
  "importantPoints": [
    "Core takeaway 1",
    "Core takeaway 2"
  ],
  "examPoints": [
    "High-yield exam fact / formula / comparison likely to be tested"
  ]
}

STUDY MATERIAL:
${contextText}`;

  const userPrompt = `Synthesize the provided study material into the structured JSON revision summary.`;

  try {
    const rawContent = await requestAiCompletion({
      task: "summary",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    const parsedSummary = parseSummaryResponse(rawContent);

    return {
      summary: {
        ...parsedSummary,
        sources,
        generatedAt: new Date().toISOString()
      },
      error: null
    };
  } catch (err) {
    console.error("Summary generation error:", err.message);
    return {
      summary: null,
      error: err.message || "Failed to generate study summary. Please try again."
    };
  }
}

export const generateSummary = generateStudySummary;

/**
 * Validate and sanitize flashcard questions
 */
export function parseFlashcardsResponse(rawText) {
  const json = extractJsonPayload(rawText);
  if (!json) {
    return { title: "Study Flashcards", cards: [] };
  }

  const rawCards = Array.isArray(json) ? json : Array.isArray(json.cards) ? json.cards : [];
  const title = typeof json.title === "string" && json.title.trim() ? json.title.trim() : "Course Flashcards";

  const validDifficulties = new Set(["easy", "medium", "hard"]);
  const cards = [];
  const seenQuestions = new Set();

  for (let idx = 0; idx < rawCards.length; idx++) {
    const c = rawCards[idx];
    if (!c || typeof c !== "object") continue;

    const question = String(c.question || c.front || c.q || "").trim();
    const answer = String(c.answer || c.back || c.a || "").trim();

    if (question.length < 5 || answer.length < 2) continue;

    const normalizedQ = question.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenQuestions.has(normalizedQ)) continue;
    seenQuestions.add(normalizedQ);

    const difficultyInput = String(c.difficulty || "medium").toLowerCase().trim();
    const difficulty = validDifficulties.has(difficultyInput) ? difficultyInput : "medium";
    const keyConcept = c.keyConcept || c.concept ? String(c.keyConcept || c.concept).trim() : undefined;
    const sourceReference = c.sourceReference ? String(c.sourceReference).trim() : undefined;

    cards.push({
      id: c.id ? String(c.id).trim() : `card_${idx + 1}_${Date.now()}`,
      question,
      answer,
      difficulty,
      keyConcept,
      sourceReference
    });
  }

  return { title, cards };
}

/**
 * Generate AI Flashcards
 */
export async function generateFlashcards(contextData = {}, options = {}) {
  let contextText = "";
  let sources = [];
  let hasReadableNotes = true;

  if (typeof contextData === "string") {
    contextText = contextData.trim();
    hasReadableNotes = contextText.length > 0;
  } else if (typeof contextData === "object" && contextData !== null) {
    contextText = (contextData.contextText || "").trim();
    sources = contextData.sources || [];
    hasReadableNotes = contextData.hasReadableNotes !== false && contextText.length > 0;
  }

  if (!hasReadableNotes || !contextText) {
    return {
      deck: null,
      error: "No readable study material available for flashcards. Please upload text-based notes."
    };
  }

  const targetCount = options.count || 10;
  const subjectHeader = options.subjectName ? `SUBJECT: ${options.subjectName}` : "SUBJECT: Academic Course";
  const docHeader = options.docName ? `DOCUMENT: ${options.docName}` : "SCOPE: All Subject Notes";

  const systemPrompt = `You are ASTRA AI, an expert academic tutor specializing in active recall and spaced repetition. Generate high-yield study flashcards based strictly on the provided study material.

${subjectHeader}
${docHeader}

RULES:
1. Target count: Generate exactly ${targetCount} high-yield flashcards.
2. Front (Question): Clear, unambiguous, conceptual, testable questions (definitions, mechanisms, comparisons, formulas).
3. Back (Answer): Concise, precise, high-yield explanation (1-3 sentences or clear bullet points).
4. Difficulty: Assign 'easy', 'medium', or 'hard'.
5. Grounding: Every card must be derived strictly from the provided text.
6. Format: Return ONLY a valid JSON object matching the schema below.

JSON SCHEMA:
{
  "title": "Topic or Subject Title",
  "cards": [
    {
      "question": "Clear conceptual question?",
      "answer": "Concise, precise explanation.",
      "difficulty": "easy" | "medium" | "hard",
      "keyConcept": "Short Topic Tag",
      "sourceReference": "Optional document or page hint"
    }
  ]
}

STUDY MATERIAL:
${contextText}`;

  const userPrompt = `Generate ${targetCount} flashcards in JSON format for the provided material.`;

  try {
    const rawContent = await requestAiCompletion({
      task: "flashcards",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 3000
    });

    const parsed = parseFlashcardsResponse(rawContent);

    if (!parsed.cards || parsed.cards.length === 0) {
      return {
        deck: null,
        error: "Unable to parse valid flashcards from the study material. Please try again."
      };
    }

    return {
      deck: {
        id: `deck_${Date.now()}`,
        title: parsed.title,
        cards: parsed.cards,
        count: parsed.cards.length,
        generatedAt: new Date().toISOString(),
        sourceDocumentIds: sources.map(s => s.docId).filter(Boolean)
      },
      error: null
    };
  } catch (err) {
    console.error("Flashcards generation error:", err.message);
    return {
      deck: null,
      error: err.message || "Failed to generate flashcards. Please try again."
    };
  }
}

/**
 * Validate and clean parsed practice quiz payload
 */
export function parseQuizResponse(rawText) {
  const json = extractJsonPayload(rawText);
  if (!json) {
    return { title: "Practice Quiz", questions: [] };
  }

  const rawQuestions = Array.isArray(json) ? json : Array.isArray(json.questions) ? json.questions : [];
  const title = typeof json.title === "string" && json.title.trim() ? json.title.trim() : "Practice Examination";

  const validDifficulties = new Set(["easy", "medium", "hard"]);
  const questions = [];
  const seenQuestions = new Set();

  for (let idx = 0; idx < rawQuestions.length; idx++) {
    const q = rawQuestions[idx];
    if (!q || typeof q !== "object") continue;

    const questionText = String(q.question || q.prompt || "").trim();
    if (questionText.length < 5) continue;

    const normalizedQ = questionText.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenQuestions.has(normalizedQ)) continue;
    seenQuestions.add(normalizedQ);

    const type = String(q.type || "mcq").toLowerCase().trim();
    const difficultyInput = String(q.difficulty || "medium").toLowerCase().trim();
    const difficulty = validDifficulties.has(difficultyInput) ? difficultyInput : "medium";
    const explanation = String(q.explanation || q.reason || "").trim() || "Explanation derived from study material.";
    const sourceReference = q.sourceReference ? String(q.sourceReference).trim() : undefined;
    const id = q.id && String(q.id).trim().length > 0
      ? String(q.id).trim()
      : `q_${idx + 1}_${Math.random().toString(36).slice(2, 9)}`;

    // 1. MCQ Question Validation
    if (type === "mcq" || type === "multiple_choice") {
      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const options = rawOptions.map(o => String(o).trim()).filter(Boolean);

      if (options.length < 2) continue;

      let correctAnswer = 0;
      if (typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer < options.length) {
        correctAnswer = q.correctAnswer;
      } else if (typeof q.correctAnswer === "string") {
        const foundIdx = options.findIndex(o => o.toLowerCase() === q.correctAnswer.toLowerCase());
        correctAnswer = foundIdx >= 0 ? foundIdx : 0;
      }

      questions.push({
        id,
        type: "mcq",
        question: questionText,
        options,
        correctAnswer,
        explanation,
        difficulty,
        sourceReference
      });
    }
    // 2. True / False Question Validation
    else if (type === "true_false" || type === "tf" || type === "boolean") {
      let correctAnswer = true;
      if (typeof q.correctAnswer === "boolean") {
        correctAnswer = q.correctAnswer;
      } else if (typeof q.correctAnswer === "string") {
        correctAnswer = q.correctAnswer.toLowerCase() === "true";
      }

      questions.push({
        id,
        type: "true_false",
        question: questionText,
        options: ["True", "False"],
        correctAnswer,
        explanation,
        difficulty,
        sourceReference
      });
    }
    // 3. Short Answer Question Validation
    else if (type === "short_answer" || type === "free_text") {
      const expectedAnswer = String(q.expectedAnswer || q.answer || "").trim();
      if (expectedAnswer.length < 2) continue;

      const rawKeyPoints = Array.isArray(q.keyPoints) ? q.keyPoints : [];
      const keyPoints = rawKeyPoints.map(kp => String(kp).trim()).filter(Boolean);

      questions.push({
        id,
        type: "short_answer",
        question: questionText,
        expectedAnswer,
        keyPoints: keyPoints.length > 0 ? keyPoints : [expectedAnswer],
        explanation,
        difficulty,
        sourceReference
      });
    }
  }

  return { title, questions };
}

/**
 * Grade student answers locally against question definitions
 */
export function gradeQuiz(questions = [], userAnswers = {}) {
  let score = 0;
  const results = [];

  for (const q of questions) {
    const userAns = userAnswers[q.id];
    let isCorrect = false;
    let status = "unanswered"; // "correct" | "incorrect" | "partial" | "unanswered"
    let earnedPoints = 0;

    if (userAns === undefined || userAns === null || (typeof userAns === "string" && userAns.trim() === "")) {
      status = "unanswered";
      isCorrect = false;
      earnedPoints = 0;
    } else if (q.type === "mcq") {
      const userIndex = Number(userAns);
      isCorrect = userIndex === Number(q.correctAnswer);
      status = isCorrect ? "correct" : "incorrect";
      earnedPoints = isCorrect ? 1 : 0;
    } else if (q.type === "true_false") {
      const boolUserAns = typeof userAns === "boolean" ? userAns : String(userAns).toLowerCase() === "true";
      const boolCorrectAns = typeof q.correctAnswer === "boolean" ? q.correctAnswer : String(q.correctAnswer).toLowerCase() === "true";
      isCorrect = boolUserAns === boolCorrectAns;
      status = isCorrect ? "correct" : "incorrect";
      earnedPoints = isCorrect ? 1 : 0;
    } else if (q.type === "short_answer") {
      const userText = String(userAns).toLowerCase().trim();
      const expectedText = String(q.expectedAnswer || "").toLowerCase().trim();
      const keyPoints = Array.isArray(q.keyPoints) ? q.keyPoints : [];

      if (!userText) {
        status = "unanswered";
        isCorrect = false;
        earnedPoints = 0;
      } else {
        const cleanUser = userText.replace(/[^a-z0-9\s]/g, " ");
        const userWords = new Set(cleanUser.split(/\s+/).filter(w => w.length > 2));
        
        let matchedKeyPoints = 0;
        for (const kp of keyPoints) {
          const kpWords = kp.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
          const hasOverlap = kpWords.some(w => userWords.has(w));
          if (hasOverlap) matchedKeyPoints++;
        }

        const exactExpectedOverlap = expectedText.split(/\s+/).filter(w => w.length > 3 && userWords.has(w)).length;
        const totalKeyPoints = keyPoints.length;

        const isFullMatch = userText === expectedText || 
          (totalKeyPoints > 1 && matchedKeyPoints === totalKeyPoints) ||
          (totalKeyPoints === 1 && matchedKeyPoints === 1 && exactExpectedOverlap >= 2) ||
          (exactExpectedOverlap >= 4);

        if (isFullMatch) {
          isCorrect = true;
          status = "correct";
          earnedPoints = 1;
        } else if (matchedKeyPoints > 0 || exactExpectedOverlap > 0) {
          isCorrect = false;
          status = "partial";
          earnedPoints = 0.5;
        } else {
          isCorrect = false;
          status = "incorrect";
          earnedPoints = 0;
        }
      }
    }

    score += earnedPoints;

    results.push({
      questionId: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      difficulty: q.difficulty,
      userAnswer: userAns,
      correctAnswer: q.type === "mcq" ? (q.options ? q.options[q.correctAnswer] : q.correctAnswer) : (q.type === "true_false" ? (q.correctAnswer ? "True" : "False") : q.expectedAnswer),
      correctAnswerRaw: q.correctAnswer,
      expectedAnswer: q.expectedAnswer,
      keyPoints: q.keyPoints,
      explanation: q.explanation || "No explanation provided.",
      sourceReference: q.sourceReference,
      isCorrect,
      status,
      earnedPoints
    });
  }

  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const correctCount = results.filter(r => r.status === "correct").length;
  const partialCount = results.filter(r => r.status === "partial").length;
  const incorrectCount = results.filter(r => r.status === "incorrect").length;
  const unansweredCount = results.filter(r => r.status === "unanswered").length;

  return {
    score,
    totalQuestions,
    percentage,
    correctCount,
    partialCount,
    incorrectCount,
    unansweredCount,
    results
  };
}

/**
 * Generate AI Practice Quiz
 */
export async function generateQuiz(contextData = {}, options = {}) {
  let contextText = "";
  let sources = [];
  let hasReadableNotes = true;

  if (typeof contextData === "string") {
    contextText = contextData.trim();
    hasReadableNotes = contextText.length > 0;
  } else if (typeof contextData === "object" && contextData !== null) {
    contextText = (contextData.contextText || "").trim();
    sources = contextData.sources || [];
    hasReadableNotes = contextData.hasReadableNotes !== false && contextText.length > 0;
  }

  if (!hasReadableNotes || !contextText) {
    return {
      quiz: null,
      error: "No readable study material available for quiz generation. Please upload text-based notes."
    };
  }

  const targetCount = options.count || 10;
  const qType = options.questionType || "mixed";
  const subjectHeader = options.subjectName ? `SUBJECT: ${options.subjectName}` : "SUBJECT: Academic Course";
  const docHeader = options.docName ? `DOCUMENT: ${options.docName}` : "SCOPE: All Subject Notes";

  const typeInstruction = qType === "mcq"
    ? "Generate ONLY Multiple Choice Questions (type: 'mcq') with exactly 4 options and 1 correct answer."
    : qType === "true_false"
    ? "Generate ONLY True/False Questions (type: 'true_false') with a boolean correctAnswer."
    : qType === "short_answer"
    ? "Generate ONLY Short Answer Questions (type: 'short_answer') with concise expected answers and 2-3 key points."
    : "Generate a balanced MIX of Multiple Choice (type: 'mcq'), True/False (type: 'true_false'), and Short Answer (type: 'short_answer') questions.";

  const systemPrompt = `You are ASTRA AI, an expert academic examination specialist who creates rigorous, high-yield practice quizzes for university students.

${subjectHeader}
${docHeader}

RULES:
1. Target Count: Generate exactly ${targetCount} questions.
2. Question Format: ${typeInstruction}
3. Academic Grounding: Every question and answer must be strictly derived from the provided study material.
4. Explanations: Provide a concise, clear academic explanation for why the answer is correct based on the text.
5. Format: Return ONLY a valid JSON object matching the schema below.

JSON SCHEMA:
{
  "title": "Practice Exam Title",
  "questions": [
    {
      "type": "mcq",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct according to notes.",
      "difficulty": "medium",
      "sourceReference": "Document or section hint"
    },
    {
      "type": "true_false",
      "question": "Statement to evaluate?",
      "correctAnswer": true,
      "explanation": "Explanation from text.",
      "difficulty": "easy"
    },
    {
      "type": "short_answer",
      "question": "Open conceptual question?",
      "expectedAnswer": "Model answer string.",
      "keyPoints": ["key term 1", "key term 2"],
      "explanation": "Explanation from text.",
      "difficulty": "hard"
    }
  ]
}

STUDY MATERIAL:
${contextText}`;

  const userPrompt = `Generate a ${targetCount}-question practice exam in JSON format.`;

  try {
    const rawContent = await requestAiCompletion({
      task: "quiz",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 3500
    });

    const parsed = parseQuizResponse(rawContent);

    if (!parsed.questions || parsed.questions.length === 0) {
      return {
        quiz: null,
        error: "Unable to parse valid practice questions from the study material. Please try again."
      };
    }

    return {
      quiz: {
        id: `quiz_${Date.now()}`,
        title: parsed.title,
        questions: parsed.questions,
        count: parsed.questions.length,
        questionType: qType,
        generatedAt: new Date().toISOString(),
        sourceDocumentIds: sources.map(s => s.docId).filter(Boolean)
      },
      error: null
    };
  } catch (err) {
    console.error("Quiz generation error:", err.message);
    return {
      quiz: null,
      error: err.message || "Failed to generate practice quiz. Please try again."
    };
  }
}

/**
 * Generate key study points
 */
export async function generateKeyPoints(contextText) {
  if (!contextText || typeof contextText !== "string" || contextText.trim().length === 0) {
    return [];
  }

  const prompt = `Extract 5 to 7 high-yield, exam-relevant key points from the following study material.
Return ONLY bullet points starting with "- ".

STUDY MATERIAL:
${contextText.slice(0, 4000)}`;

  try {
    const content = await requestAiCompletion({
      task: "chat",
      messages: [
        {
          role: "system",
          content: "You are ASTRA AI. Extract concise high-yield academic takeaways."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return content
      .split("\n")
      .map(line => line.replace(/^[-*•\d.]+\s*/, "").trim())
      .filter(line => line.length > 5)
      .slice(0, 7);
  } catch (err) {
    console.error("Key points extraction error:", err.message);
    return [];
  }
}
