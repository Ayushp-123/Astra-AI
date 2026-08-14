export async function askAstra(question, notesContext = "") {
  try {
    const systemPrompt = notesContext 
      ? `You are ASTRA AI, an intelligent academic assistant. Use the following extracted notes to answer the user's questions. Do NOT use outside knowledge if the answer is within the notes. \n\nNOTES CONTEXT:\n${notesContext}`
      : "You are ASTRA AI, an intelligent academic assistant helping students understand study material. You do not have notes uploaded yet.";

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: question
            }
          ]
        })
      }
    );

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "ASTRA AI failed to generate a response.";

  } catch (error) {
    console.error("AI Error:", error);
    return "ASTRA AI encountered an error while processing your request.";
  }
}

export async function generateKeyPoints(notesContext) {
  if (!notesContext) return [];
  
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an AI that extracts key points from academic notes. Extract 5 most important bullet points. Format strictly as a JSON array of strings."
            },
            {
              role: "user",
              content: `Extract key points from these notes: \n\n${notesContext}`
            }
          ]
        })
      }
    );

    const data = await response.json();
    try {
      const parsed = JSON.parse(data.choices[0].message.content);
      return Array.isArray(parsed) ? parsed : [];
    } catch(e) {
      // fallback if AI didn't return pure JSON
      return data.choices[0].message.content.split('\n').filter(s => s.trim().length > 0);
    }
  } catch (error) {
    console.error("Key points error:", error);
    return [];
  }
}
