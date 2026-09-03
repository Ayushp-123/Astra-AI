import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleAiRequest, resetRateLimitMap } from '../server/index.js';
import { callOpenRouter } from '../server/services/openRouterService.js';
import {
  parseSummaryResponse,
  parseFlashcardsResponse,
  parseQuizResponse,
  gradeQuiz
} from '../src/services/aiService.js';
import { retrieveRelevantContext, extractKeywords } from '../src/services/contextService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

test('Phase 9 — Secure AI API Architecture Test Suite', async (t) => {

  // =========================================================================
  // TEST 1: Valid chat request reaches the backend
  // =========================================================================
  await t.test('TEST 1: Valid chat request reaches the backend', async () => {
    let calledWith = null;
    const mockCaller = async (params) => {
      calledWith = params;
      return {
        content: "Mitochondria are the powerhouse of the cell.",
        model: "openai/gpt-3.5-turbo",
        usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 }
      };
    };

    resetRateLimitMap();
    const result = await handleAiRequest({
      task: "chat",
      messages: [
        { role: "system", content: "You are ASTRA AI." },
        { role: "user", content: "What is mitochondria?" }
      ]
    }, '127.0.0.1', mockCaller);

    assert.equal(result.success, true);
    assert.equal(result.data.task, 'chat');
    assert.equal(result.data.content, "Mitochondria are the powerhouse of the cell.");
    assert.equal(calledWith.messages.length, 2);
  });

  // =========================================================================
  // TEST 2: Valid summary request reaches the backend
  // =========================================================================
  await t.test('TEST 2: Valid summary request reaches the backend', async () => {
    const mockCaller = async () => ({
      content: JSON.stringify({
        shortSummary: "A comprehensive summary of cell biology.",
        keyConcepts: ["Cell membrane", "Cytoplasm"],
        importantDefinitions: [{ term: "Osmosis", definition: "Movement of water." }],
        importantPoints: ["Cells are the basic unit of life."],
        examPoints: ["ATP is produced in mitochondria."]
      }),
      model: "openai/gpt-3.5-turbo"
    });

    resetRateLimitMap();
    const result = await handleAiRequest({
      task: "summary",
      messages: [
        { role: "system", content: "Generate summary." },
        { role: "user", content: "Synthesize notes." }
      ]
    }, '127.0.0.1', mockCaller);

    assert.equal(result.success, true);
    assert.equal(result.data.task, 'summary');
    assert.ok(result.data.content.includes("Cell membrane"));
  });

  // =========================================================================
  // TEST 3: Valid flashcard request reaches the backend
  // =========================================================================
  await t.test('TEST 3: Valid flashcard request reaches the backend', async () => {
    const mockCaller = async () => ({
      content: JSON.stringify({
        title: "Cell Biology Flashcards",
        cards: [
          { question: "What is ATP?", answer: "Adenosine triphosphate, energy currency.", difficulty: "easy" }
        ]
      }),
      model: "openai/gpt-3.5-turbo"
    });

    resetRateLimitMap();
    const result = await handleAiRequest({
      task: "flashcards",
      messages: [
        { role: "system", content: "Generate flashcards." },
        { role: "user", content: "Create 5 flashcards." }
      ]
    }, '127.0.0.1', mockCaller);

    assert.equal(result.success, true);
    assert.equal(result.data.task, 'flashcards');
    assert.ok(result.data.content.includes("Adenosine triphosphate"));
  });

  // =========================================================================
  // TEST 4: Valid quiz request reaches the backend
  // =========================================================================
  await t.test('TEST 4: Valid quiz request reaches the backend', async () => {
    const mockCaller = async () => ({
      content: JSON.stringify({
        title: "Biology Quiz",
        questions: [
          {
            type: "mcq",
            question: "Which organelle synthesizes proteins?",
            options: ["Ribosome", "Golgi", "Lysosome", "Vacuole"],
            correctAnswer: 0,
            explanation: "Ribosomes translate mRNA into polypeptide chains."
          }
        ]
      }),
      model: "openai/gpt-3.5-turbo"
    });

    resetRateLimitMap();
    const result = await handleAiRequest({
      task: "quiz",
      messages: [
        { role: "system", content: "Generate quiz." },
        { role: "user", content: "Create a 5-question test." }
      ]
    }, '127.0.0.1', mockCaller);

    assert.equal(result.success, true);
    assert.equal(result.data.task, 'quiz');
    assert.ok(result.data.content.includes("Ribosome"));
  });

  // =========================================================================
  // TEST 5: Missing task is rejected
  // =========================================================================
  await t.test('TEST 5: Missing task is rejected', async () => {
    resetRateLimitMap();
    await assert.rejects(
      async () => {
        await handleAiRequest({
          messages: [{ role: "user", content: "Hello" }]
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'MISSING_TASK');
        return true;
      }
    );
  });

  // =========================================================================
  // TEST 6: Unsupported task is rejected
  // =========================================================================
  await t.test('TEST 6: Unsupported task is rejected', async () => {
    resetRateLimitMap();
    await assert.rejects(
      async () => {
        await handleAiRequest({
          task: "hack_the_system",
          messages: [{ role: "user", content: "Hello" }]
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'UNSUPPORTED_TASK');
        return true;
      }
    );
  });

  // =========================================================================
  // TEST 7: Invalid request body is rejected
  // =========================================================================
  await t.test('TEST 7: Invalid request body is rejected', async () => {
    resetRateLimitMap();
    await assert.rejects(
      async () => {
        await handleAiRequest(null);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'INVALID_REQUEST');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await handleAiRequest("not a json object");
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'INVALID_REQUEST');
        return true;
      }
    );
  });

  // =========================================================================
  // TEST 8: Oversized context is rejected safely
  // =========================================================================
  await t.test('TEST 8: Oversized context is rejected safely', async () => {
    resetRateLimitMap();
    const oversizedText = "x".repeat(50001); // Exceeds 50,000 char limit

    await assert.rejects(
      async () => {
        await handleAiRequest({
          task: "chat",
          messages: [
            { role: "user", content: oversizedText }
          ]
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'CONTEXT_TOO_LARGE');
        return true;
      }
    );
  });

  // =========================================================================
  // TEST 9: Missing server API key returns safe configuration error
  // =========================================================================
  await t.test('TEST 9: Missing server API key returns safe configuration error', async () => {
    await assert.rejects(
      async () => {
        await callOpenRouter({
          messages: [{ role: "user", content: "Hello" }],
          apiKeyOverride: ""
        });
      },
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, 'AUTH_NOT_CONFIGURED');
        assert.ok(!err.message.includes("key_")); // Never leaks keys
        return true;
      }
    );
  });

  // =========================================================================
  // TEST 10: Upstream 429 becomes safe rate-limit response
  // =========================================================================
  await t.test('TEST 10: Upstream 429 becomes safe rate-limit response', async () => {
    const mockFetch429 = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "Rate limit exceeded upstream." } })
    });

    await assert.rejects(
      async () => {
        await callOpenRouter({
          messages: [{ role: "user", content: "Hello" }],
          apiKeyOverride: "mock-valid-key",
          fetchFn: mockFetch429
        });
      },
      (err) => {
        assert.equal(err.statusCode, 429);
        assert.equal(err.code, 'RATE_LIMITED');
        assert.ok(err.message.includes("rate limit"));
        return true;
      }
    );
  });

  // =========================================================================
  // TEST 11: Upstream 5xx becomes safe service error
  // =========================================================================
  await t.test('TEST 11: Upstream 5xx becomes safe service error', async () => {
    const mockFetch500 = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: { message: "Service Unavailable" } })
    });

    await assert.rejects(
      async () => {
        await callOpenRouter({
          messages: [{ role: "user", content: "Hello" }],
          apiKeyOverride: "mock-valid-key",
          fetchFn: mockFetch500
        });
      },
      (err) => {
        assert.equal(err.statusCode, 502);
        assert.equal(err.code, 'UPSTREAM_ERROR');
        assert.ok(!err.message.includes("Bearer")); // No token leak
        return true;
      }
    );
  });

  // =========================================================================
  // TEST 12: Frontend aiService no longer contains direct OpenRouter calls
  // =========================================================================
  await t.test('TEST 12: Frontend aiService no longer contains direct OpenRouter calls', () => {
    const aiServiceContent = fs.readFileSync(path.join(SRC_DIR, 'services/aiService.js'), 'utf-8');
    assert.ok(!aiServiceContent.includes('https://openrouter.ai'), 'aiService.js must not contain openrouter.ai URL');
    assert.ok(aiServiceContent.includes('/api/ai/chat'), 'aiService.js must call /api/ai/chat');
  });

  // =========================================================================
  // TEST 13: Frontend source does not contain VITE_OPENROUTER_API_KEY usage
  // =========================================================================
  await t.test('TEST 13: Frontend source does not contain VITE_OPENROUTER_API_KEY usage', () => {
    function scanDir(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        const fullPath = path.join(dir, f.name);
        if (f.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(js|jsx|ts|tsx|html|css)$/.test(f.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          assert.ok(
            !content.includes('VITE_OPENROUTER_API_KEY'),
            `Found forbidden VITE_OPENROUTER_API_KEY in ${fullPath}`
          );
        }
      }
    }

    scanDir(SRC_DIR);
  });

  // =========================================================================
  // TEST 14: Existing grounding/context tests still pass
  // =========================================================================
  await t.test('TEST 14: Existing grounding/context tests still pass', () => {
    const testDocs = [
      {
        id: "doc1",
        name: "Bio 101 Notes.pdf",
        subjectName: "Biology",
        chunks: [
          { page: 1, text: "Photosynthesis converts light energy into chemical energy in chloroplasts." },
          { page: 2, text: "Cellular respiration breaks down glucose to produce ATP in mitochondria." }
        ]
      }
    ];

    const keywords = extractKeywords("How does photosynthesis work in chloroplasts?");
    assert.ok(keywords.includes("photosynthesis"));
    assert.ok(keywords.includes("chloroplasts"));

    const context = retrieveRelevantContext("How does photosynthesis work in chloroplasts?", testDocs);
    assert.equal(context.hasReadableNotes, true);
    assert.equal(context.hasMatchingKeywords, true);
    assert.ok(context.contextText.includes("chloroplasts"));
    assert.equal(context.sources.length > 0, true);
    assert.equal(context.sources[0].docName, "Bio 101 Notes.pdf");
  });

  // =========================================================================
  // TEST 15: Existing summary tests still pass
  // =========================================================================
  await t.test('TEST 15: Existing summary tests still pass', () => {
    const rawAiOutput = `
\`\`\`json
{
  "shortSummary": "Overview of thermodynamics in closed systems.",
  "keyConcepts": ["Entropy", "Enthalpy", "First Law"],
  "importantDefinitions": [
    { "term": "Entropy", "definition": "Measure of molecular disorder." }
  ],
  "importantPoints": ["Energy cannot be created or destroyed."],
  "examPoints": ["Delta G = Delta H - T Delta S"]
}
\`\`\`
    `;

    const parsed = parseSummaryResponse(rawAiOutput);
    assert.equal(parsed.shortSummary, "Overview of thermodynamics in closed systems.");
    assert.equal(parsed.keyConcepts.length, 3);
    assert.equal(parsed.importantDefinitions[0].term, "Entropy");
    assert.equal(parsed.examPoints[0], "Delta G = Delta H - T Delta S");
  });

  // =========================================================================
  // TEST 16: Existing flashcard tests still pass
  // =========================================================================
  await t.test('TEST 16: Existing flashcard tests still pass', () => {
    const rawAiOutput = JSON.stringify({
      title: "Thermodynamics Flashcards",
      cards: [
        {
          question: "What is the First Law of Thermodynamics?",
          answer: "Energy is conserved.",
          difficulty: "easy",
          keyConcept: "Energy Conservation"
        },
        {
          question: "Define Gibbs Free Energy formula.",
          answer: "dG = dH - TdS",
          difficulty: "hard",
          keyConcept: "Free Energy"
        }
      ]
    });

    const parsed = parseFlashcardsResponse(rawAiOutput);
    assert.equal(parsed.title, "Thermodynamics Flashcards");
    assert.equal(parsed.cards.length, 2);
    assert.equal(parsed.cards[0].difficulty, "easy");
    assert.equal(parsed.cards[1].difficulty, "hard");
  });

  // =========================================================================
  // TEST 17: Existing quiz tests still pass
  // =========================================================================
  await t.test('TEST 17: Existing quiz tests still pass', () => {
    const rawAiOutput = JSON.stringify({
      title: "Thermodynamics Exam",
      questions: [
        {
          id: "q1",
          type: "mcq",
          question: "Which state function measures disorder?",
          options: ["Enthalpy", "Entropy", "Temperature", "Volume"],
          correctAnswer: 1,
          explanation: "Entropy measures microstates and disorder."
        },
        {
          id: "q2",
          type: "true_false",
          question: "Energy can be destroyed in isolated systems.",
          correctAnswer: false,
          explanation: "First law states energy is always conserved."
        },
        {
          id: "q3",
          type: "short_answer",
          question: "What does the second law of thermodynamics state about entropy?",
          expectedAnswer: "Total entropy of an isolated system always increases over time.",
          keyPoints: ["entropy increases", "isolated system"],
          explanation: "Second law of thermodynamics principle."
        }
      ]
    });

    const parsed = parseQuizResponse(rawAiOutput);
    assert.equal(parsed.questions.length, 3);

    // Test grading engine
    const grading = gradeQuiz(parsed.questions, {
      "q1": 1, // Correct MCQ
      "q2": false, // Correct T/F
      "q3": "The total entropy of an isolated system increases over time." // Correct Short Answer
    });

    assert.equal(grading.score, 3);
    assert.equal(grading.percentage, 100);
    assert.equal(grading.correctCount, 3);
  });

});
