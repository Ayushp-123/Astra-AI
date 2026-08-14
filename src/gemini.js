export async function askAstra(question) {

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
              content:
                "You are ASTRA AI, an intelligent academic assistant helping students understand uploaded notes and study material."
            },

            {
              role: "user",
              content: question
            }
          ]

        })

      }
    )

    const data = await response.json()

    return data.choices[0].message.content

  } catch (error) {

    console.log(error)

    return "ASTRA AI failed to respond."

  }

}