import { useState } from "react"
import { extractTextFromPDF } from "./pdfReader"
import { askAstra } from "./gemini"

function App() {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)

  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState([])

  // Extracted PDF text
  const [notesText, setNotesText] = useState("")

  // Subject Detection
  const detectSubjects = (uploadedFiles) => {
    const detectedSubjects = []

    uploadedFiles.forEach((file) => {
      const name = file.name.toLowerCase()

      if (name.includes("math")) {
        detectedSubjects.push("Mathematics")
      } else if (name.includes("dbms")) {
        detectedSubjects.push("DBMS")
      } else if (name.includes("os")) {
        detectedSubjects.push("Operating System")
      } else if (name.includes("network")) {
        detectedSubjects.push("Computer Networks")
      } else if (name.includes("java")) {
        detectedSubjects.push("Java")
      } else if (name.includes("python")) {
        detectedSubjects.push("Python")
      } else {
        detectedSubjects.push("Uncategorized")
      }
    })

    return [...new Set(detectedSubjects)]
  }

  // Handle File Upload
  const handleUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files || [])

    if (uploadedFiles.length === 0) {
      return
    }

    setFiles(uploadedFiles)
    setProcessing(true)
    setNotesText("")

    try {
      let extractedText = ""

      for (const file of uploadedFiles) {
        if (file.type === "application/pdf") {
          try {
            const text = await extractTextFromPDF(file)
            extractedText += `${text}\n`
          } catch (error) {
            console.error(`Failed to extract text from ${file.name}:`, error)
          }
        }
      }

      // Save extracted PDF text
      setNotesText(extractedText.trim().substring(0, 3000))

      // Detect subjects
      const generatedSubjects = detectSubjects(uploadedFiles)
      setSubjects(generatedSubjects)
    } catch (error) {
      console.error("Upload processing failed:", error)
    } finally {
      setProcessing(false)
    }
  }

  // AI Chat
  const handleSend = async () => {
    if (!chatInput.trim()) return

    const currentQuestion = chatInput.trim()

    const userMessage = {
      sender: "user",
      text: currentQuestion,
    }

    setMessages((prev) => [...prev, userMessage])
    setChatInput("")

    try {
      const aiResponse = await askAstra(currentQuestion, notesText)

      const aiMessage = {
        sender: "ai",
        text: aiResponse,
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("AI request failed:", error)

      const errorMessage = {
        sender: "ai",
        text: "Sorry, I couldn't process that question right now.",
      }

      setMessages((prev) => [...prev, errorMessage])
    }
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-500 opacity-20 blur-3xl rounded-full"></div>

      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-blue-500 opacity-20 blur-3xl rounded-full"></div>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10 relative z-10">
        <h1 className="text-3xl font-bold tracking-wider text-purple-400">
          ASTRA
        </h1>

        <button className="px-5 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition">
          Login
        </button>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 px-8 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Turn Study Chaos
            <br />
            Into <span className="text-purple-400">Clarity</span>
          </h1>

          <p className="mt-5 text-gray-400 text-lg max-w-2xl">
            Upload scattered PDFs, screenshots and notes.
            ASTRA automatically organizes everything into structured,
            searchable intelligence using AI.
          </p>
        </div>

        {/* Search + Upload */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <input
            type="text"
            placeholder="Search notes, topics, concepts..."
            className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none placeholder-gray-500 backdrop-blur-md"
          />

          <label className="px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 transition font-semibold shadow-lg shadow-purple-500/30 cursor-pointer text-center">
            Upload Files

            <input
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </div>

        {/* Upload Area */}
        <label className="border border-dashed border-white/20 rounded-3xl p-16 bg-white/5 backdrop-blur-md text-center hover:bg-white/10 transition cursor-pointer block">
          <div className="text-6xl mb-6">📂</div>

          <h2 className="text-3xl font-bold mb-4">
            Drop your study material here
          </h2>

          <p className="text-gray-400">
            PDFs, screenshots, notes and documents
          </p>

          <input
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </label>

        {/* Uploaded Files */}
        {files.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-5">Uploaded Files</h2>

            <div className="space-y-4">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10"
                >
                  {file.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Processing */}
        {processing && (
          <div className="mt-12 p-8 rounded-3xl bg-purple-500/10 border border-purple-500/20 animate-pulse">
            <h2 className="text-2xl font-bold mb-4">
              ASTRA AI Processing...
            </h2>

            <div className="space-y-3 text-gray-300">
              <p>🔍 Detecting subjects...</p>
              <p>🧠 Extracting concepts...</p>
              <p>⚡ Organizing knowledge structure...</p>
            </div>
          </div>
        )}

        {/* Generated Subjects */}
        {subjects.length > 0 && (
          <div className="mt-14">
            <h2 className="text-3xl font-bold mb-8">
              Generated Knowledge Structure
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subjects.map((subject, index) => (
                <div
                  key={`${subject}-${index}`}
                  onClick={() => setSelectedSubject(subject)}
                  className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                >
                  <div className="text-5xl mb-4">📚</div>

                  <h3 className="text-2xl font-bold mb-2">{subject}</h3>

                  <p className="text-gray-400">
                    AI organized notes and intelligent search.
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subject View */}
        {selectedSubject && (
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* PDF Viewer */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-[600px] overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">{selectedSubject}</h2>

                <button className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 transition">
                  Summarize
                </button>
              </div>

              <div className="space-y-6 text-gray-300 leading-8">
                <p>
                  Uploaded PDF content is now being processed by ASTRA AI.
                </p>

                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 whitespace-pre-wrap overflow-auto max-h-[350px]">
                  {notesText
                    ? notesText.substring(0, 3000)
                    : "No PDF text extracted yet."}
                </div>
              </div>
            </div>

            {/* AI Chat */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col h-[600px]">
              <h2 className="text-3xl font-bold mb-6">ASTRA AI Assistant</h2>

              {/* Chat Messages */}
              <div className="flex-1 overflow-auto space-y-4 mb-6 pr-2">
                {messages.length === 0 && (
                  <div className="text-gray-500">
                    Ask anything about your uploaded notes...
                  </div>
                )}

                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-2xl max-w-[90%] ${
                      msg.sender === "user"
                        ? "bg-purple-600 ml-auto"
                        : "bg-white/10"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSend()
                    }
                  }}
                  placeholder="Ask ASTRA about your notes..."
                  className="flex-1 px-5 py-4 rounded-2xl bg-black/40 border border-white/10 outline-none"
                />

                <button
                  onClick={handleSend}
                  className="px-6 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App