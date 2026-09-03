import http from 'http';
import { callOpenRouter } from './services/openRouterService.js';

try {
  process.loadEnvFile();
} catch {
  // If .env is missing or in test environment, continue gracefully
}

const PORT = process.env.PORT || 3001;
const MAX_PAYLOAD_BYTES = 100 * 1024; // 100 KB
const MAX_CONTEXT_CHARS = 50000; // 50,000 chars

const ALLOWED_TASKS = new Set(['chat', 'summary', 'flashcards', 'quiz', 'custom']);

// Lightweight in-memory rate limiter per IP (60 requests per minute)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

export function resetRateLimitMap() {
  rateLimitMap.clear();
}

export function isRateLimited(ip) {
  const now = Date.now();

  // Opportunistic purge of expired records if map gets large
  if (rateLimitMap.size > 200) {
    for (const [key, rec] of rateLimitMap.entries()) {
      if (now > rec.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, record);
    return false;
  }

  record.count++;
  rateLimitMap.set(ip, record);
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

/**
 * Core validation and AI request handler
 */
export async function handleAiRequest(body, clientIp = '127.0.0.1', openRouterCaller = callOpenRouter) {
  if (isRateLimited(clientIp)) {
    const err = new Error("Rate limit exceeded. Please slow down your requests.");
    err.statusCode = 429;
    err.code = "RATE_LIMITED";
    throw err;
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const err = new Error("Invalid request body. Expected a JSON object.");
    err.statusCode = 400;
    err.code = "INVALID_REQUEST";
    throw err;
  }

  const { task, messages, question, context, temperature, max_tokens, model } = body;

  // 1. Task Validation
  if (!task || typeof task !== 'string' || task.trim().length === 0) {
    const err = new Error("Missing required field: 'task'.");
    err.statusCode = 400;
    err.code = "MISSING_TASK";
    throw err;
  }

  const normalizedTask = task.toLowerCase().trim();
  if (!ALLOWED_TASKS.has(normalizedTask)) {
    const err = new Error(`Unsupported task: '${task}'. Supported tasks: ${Array.from(ALLOWED_TASKS).join(', ')}`);
    err.statusCode = 400;
    err.code = "UNSUPPORTED_TASK";
    throw err;
  }

  // 2. Normalize and validate messages
  let effectiveMessages = messages;

  if (!effectiveMessages && (question || context)) {
    effectiveMessages = [];
    if (context && typeof context === 'string') {
      effectiveMessages.push({
        role: "system",
        content: `You are ASTRA AI study assistant. Based on this study material: ${context}`
      });
    }
    if (question && typeof question === 'string') {
      effectiveMessages.push({
        role: "user",
        content: question
      });
    }
  }

  if (!Array.isArray(effectiveMessages) || effectiveMessages.length === 0) {
    const err = new Error("Missing or invalid 'messages' array.");
    err.statusCode = 400;
    err.code = "INVALID_MESSAGES";
    throw err;
  }

  let totalChars = 0;
  for (const m of effectiveMessages) {
    if (!m || typeof m !== 'object' || typeof m.content !== 'string' || typeof m.role !== 'string') {
      const err = new Error("Each message must contain 'role' and string 'content'.");
      err.statusCode = 400;
      err.code = "INVALID_MESSAGE_FORMAT";
      throw err;
    }
    totalChars += m.content.length;
  }

  if (totalChars > MAX_CONTEXT_CHARS) {
    const err = new Error(`Input context exceeds maximum limit of ${MAX_CONTEXT_CHARS} characters.`);
    err.statusCode = 400;
    err.code = "CONTEXT_TOO_LARGE";
    throw err;
  }

  // 3. Delegate to server-side OpenRouter caller
  const aiResult = await openRouterCaller({
    messages: effectiveMessages,
    temperature,
    max_tokens,
    model
  });

  return {
    success: true,
    data: {
      task: normalizedTask,
      content: aiResult.content,
      model: aiResult.model,
      usage: aiResult.usage
    }
  };
}

/**
 * Check if origin is allowed for CORS
 */
function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return isLocalhost;
  } catch {
    return false;
  }
}

/**
 * Create HTTP Server Instance
 */
export function createServer(customOpenRouterCaller) {
  return http.createServer(async (req, res) => {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    const origin = req.headers.origin;

    // CORS Headers
    if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = (req.url || '').split('?')[0];

    // Health Check Endpoint
    if (req.method === 'GET' && (url === '/api/health' || url === '/health')) {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, status: 'healthy', timestamp: new Date().toISOString() }));
      return;
    }

    // AI Endpoints (/api/ai/chat, /api/ai, /api/ai/completions)
    if (req.method === 'POST' && (url === '/api/ai/chat' || url === '/api/ai' || url === '/api/ai/completions')) {
      let bodyData = '';
      let bytesReceived = 0;
      let payloadTooLarge = false;

      req.on('data', (chunk) => {
        bytesReceived += chunk.length;
        if (bytesReceived > MAX_PAYLOAD_BYTES) {
          payloadTooLarge = true;
          res.writeHead(413);
          res.end(JSON.stringify({
            success: false,
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Request payload size exceeds 100 KB limit."
            }
          }));
          req.destroy();
          return;
        }
        bodyData += chunk;
      });

      req.on('end', async () => {
        if (payloadTooLarge) return;

        let parsedBody;
        try {
          parsedBody = JSON.parse(bodyData || '{}');
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Malformed JSON in request body."
            }
          }));
          return;
        }

        try {
          const result = await handleAiRequest(parsedBody, clientIp, customOpenRouterCaller || callOpenRouter);
          res.writeHead(200);
          res.end(JSON.stringify(result));
        } catch (err) {
          const status = err.statusCode || 500;
          const code = err.code || "INTERNAL_ERROR";
          const message = err.message || "An error occurred while processing the request.";

          res.writeHead(status);
          res.end(JSON.stringify({
            success: false,
            error: {
              code,
              message
            }
          }));
        }
      });

      return;
    }

    // 404 for unknown endpoints
    res.writeHead(404);
    res.end(JSON.stringify({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Endpoint ${req.method} ${req.url} not found.`
      }
    }));
  });
}

// Start server if run directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server/index.js') || 
  process.argv[1].endsWith('server\\index.js')
);

if (isDirectRun) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`[ASTRA AI Server] Secure AI proxy listening on port ${PORT}`);
  });

  const handleShutdown = (signal) => {
    console.log(`\n[ASTRA AI Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[ASTRA AI Server] Server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[ASTRA AI Server] Forced shutdown timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}
