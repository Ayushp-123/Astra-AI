import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { askAstra } from '../../services/aiService';
import { retrieveRelevantContext } from '../../services/contextService';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { Send, Bot, User, Sparkles, BookOpen, Globe, FileText } from 'lucide-react';

const ChatPanel = () => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  
  const { 
    messages, 
    addMessage, 
    getSelectedSubject, 
    getDocumentsForSubject, 
    selectedDocumentId,
    isAiTyping, 
    setIsAiTyping,
    aiTypingScopes
  } = useStore();

  const selectedSubject = getSelectedSubject();
  const subjectDocs = selectedSubject ? getDocumentsForSubject(selectedSubject.id) : [];
  const activeDocs = selectedDocumentId 
    ? subjectDocs.filter(d => d.id === selectedDocumentId)
    : subjectDocs;

  const currentScopeKey = selectedDocumentId 
    ? `doc_${selectedDocumentId}` 
    : (selectedSubject ? `subj_${selectedSubject.id}` : 'global');

  const isScopeTyping = aiTypingScopes ? !!aiTypingScopes[currentScopeKey] : isAiTyping;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isScopeTyping]);

  const handleSend = async () => {
    if (!input.trim() || isScopeTyping) return;

    const requestScopeKey = currentScopeKey;
    const currentQuestion = input.trim();
    const userMessage = { sender: 'user', text: currentQuestion };
    
    // Bind to the exact scope active when question was submitted
    addMessage(userMessage, requestScopeKey);
    
    setInput("");
    setIsAiTyping(true, requestScopeKey);

    try {
      // 1. Retrieve relevant context chunks scoped to active documents
      const contextResult = retrieveRelevantContext(currentQuestion, activeDocs);

      // 2. Query ASTRA AI with grounded prompt
      const response = await askAstra(currentQuestion, contextResult, {
        subjectName: selectedSubject?.name,
        docName: activeDocs.length === 1 ? activeDocs[0].name : undefined
      });

      const aiMessage = {
        sender: 'ai',
        text: typeof response === 'object' ? response.answer : response,
        groundingStatus: typeof response === 'object' ? response.groundingStatus : 'grounded',
        sources: typeof response === 'object' ? response.sources : []
      };

      addMessage(aiMessage, requestScopeKey);
    } catch (err) {
      console.error("Chat error:", err);
      addMessage({ 
        sender: 'ai', 
        text: "ASTRA encountered an issue answering. Please try again.",
        groundingStatus: "not_in_notes",
        sources: []
      }, requestScopeKey);
    } finally {
      setIsAiTyping(false, requestScopeKey);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-none">
              {selectedSubject?.name || 'ASTRA'} Assistant
            </h2>
            <p className="text-xs text-green-400 mt-1">
              Grounded in {activeDocs.length} {activeDocs.length === 1 ? 'document' : 'documents'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Ask about {selectedSubject?.name || 'your notes'}
            </h3>
            <p className="text-sm text-gray-400 max-w-sm">
              I am grounded in your uploaded {selectedSubject?.name || 'subject'} material. Ask me to explain concepts, solve doubts, or summarize topics.
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={idx}
              className={`flex items-end gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.sender === 'user' ? 'bg-white/10' : 'bg-purple-600'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>

              {/* Message Bubble Container */}
              <div className="flex flex-col max-w-[85%] space-y-1.5">
                <div className={`px-5 py-3.5 rounded-2xl shadow-lg ${
                  msg.sender === 'user' 
                    ? 'bg-white/10 text-white rounded-br-sm border border-white/5 ml-auto' 
                    : 'bg-gradient-to-br from-purple-950/40 to-indigo-950/30 text-white rounded-bl-sm border border-purple-500/30'
                }`}>
                  {msg.sender === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <MarkdownRenderer content={msg.text} />
                  )}
                </div>

                {/* Grounding & Source Badges (AI messages only) */}
                {msg.sender === 'ai' && (
                  <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-gray-400">
                    {msg.groundingStatus === 'grounded' && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <BookOpen className="w-3 h-3" /> Grounded in Notes
                      </span>
                    )}
                    {msg.groundingStatus === 'not_in_notes' && (
                      <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <Globe className="w-3 h-3" /> General Knowledge
                      </span>
                    )}
                    {msg.groundingStatus === 'partially_grounded' && (
                      <span className="inline-flex items-center gap-1 text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                        <BookOpen className="w-3 h-3" /> Notes + Context
                      </span>
                    )}

                    {/* Sources reference if present */}
                    {msg.sources && msg.sources.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 truncate max-w-[260px]">
                        <FileText className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        <span className="truncate">
                          {msg.sources.map(s => `${s.docName} (p. ${s.page})`).join(', ')}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isScopeTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10 rounded-bl-sm flex gap-1">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-gray-400" />
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-gray-400" />
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-gray-400" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/40 border-t border-white/10 backdrop-blur-md">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={`Ask ASTRA about ${selectedSubject?.name || 'notes'}`}
            placeholder={`Ask ASTRA about ${selectedSubject?.name || 'notes'}...`}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isScopeTyping}
            aria-label="Send message"
            className="absolute right-2 p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-700 transition-colors text-white shadow-lg cursor-pointer"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-500 mt-3">
          ASTRA AI answers using your uploaded study material.
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;


