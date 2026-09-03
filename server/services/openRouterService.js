/**
 * ASTRA AI Secure OpenRouter Backend Service
 * 
 * Server-only service for communicating with OpenRouter API.
 * The API key is securely accessed from process.env on the server.
 */

try {
  process.loadEnvFile();
} catch {
  // If .env is missing or in test environment, continue gracefully
}

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-3.5-turbo";
const ALLOWED_MODELS = new Set([
  "openai/gpt-3.5-turbo",
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3-8b-instruct:free"
]);

/**
 * Call OpenRouter AI provider securely
 */
export async function callOpenRouter({
  messages,
  temperature = 0.3,
  max_tokens = 2000,
  model = DEFAULT_MODEL,
  fetchFn = fetch,
  apiKeyOverride = null
} = {}) {
  const rawKey = apiKeyOverride !== null 
    ? apiKeyOverride 
    : (process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY);
  
  const apiKey = typeof rawKey === "string" ? rawKey.trim() : "";

  if (!apiKey || apiKey === "your_openrouter_api_key_here") {
    const err = new Error("AI service authentication is not configured on the server.");
    err.statusCode = 503;
    err.code = "AUTH_NOT_CONFIGURED";
    throw err;
  }

  // Enforce server-controlled model selection
  const selectedModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

  let response;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;

  try {
    response = await fetchFn(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://astra-ai.local",
        "X-Title": "ASTRA AI Academic Assistant"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: typeof temperature === "number" ? Math.max(0, Math.min(1, temperature)) : 0.3,
        max_tokens: typeof max_tokens === "number" ? Math.min(4000, max_tokens) : 2000
      }),
      signal: controller ? controller.signal : undefined
    });
  } catch (fetchErr) {
    if (fetchErr?.name === "AbortError" || fetchErr?.code === "ABORT_ERR") {
      const err = new Error("Upstream AI provider request timed out. Please try again.");
      err.statusCode = 504;
      err.code = "GATEWAY_TIMEOUT";
      throw err;
    }
    const err = new Error("Unable to establish connection to upstream AI provider.");
    err.statusCode = 502;
    err.code = "UPSTREAM_ERROR";
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const is429 = response.status === 429;
    const isAuth = response.status === 401 || response.status === 403;
    const isServer = response.status >= 500;

    const err = new Error(
      is429
        ? "AI rate limit reached. Please wait a moment before trying again."
        : isAuth
        ? "AI service authorization failure."
        : "Upstream AI provider error."
    );
    err.statusCode = is429 ? 429 : isAuth ? 401 : isServer ? 502 : response.status;
    err.code = is429 ? "RATE_LIMITED" : isAuth ? "AUTH_ERROR" : "UPSTREAM_ERROR";
    throw err;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || "";

  return {
    content: rawContent,
    model: data.model || selectedModel,
    usage: data.usage || null
  };
}
