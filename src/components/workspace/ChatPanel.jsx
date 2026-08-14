import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { askAstra } from '../../services/aiService';
import { Send, Bot, User, Sparkles } from 'lucide-react';

const ChatPanel = () => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  
  const { messages, addMessage, notesText, isAiTyping, setIsAiTyping } = useStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const handleSend = async () => {
    if (!input.trim() || isAiTyping) return;

    const userMessage = { sender: 'user', text: input };
    addMessage(userMessage);
    
    const currentQuestion = input;
    setInput("");
    setIsAiTyping(true);

    const response = await askAstra(currentQuestion, notesText.substring(0, 8000)); // limit context size
    
    const aiMessage = { sender: 'ai', text: response };
    addMessage(aiMessage);
    setIsAiTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col h-[600px] lg:h-full overflow-hidden shadow-2xl relative">
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
            <h2 className="text-xl font-bold text-white leading-none">ASTRA Assistant</h2>
            <p className="text-xs text-green-400 mt-1">Online & Ready</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ask about your notes</h3>
            <p className="text-sm text-gray-400 max-w-sm">
              I have analyzed your documents. Ask me to explain concepts, summarize topics, or clarify doubts based ONLY on your uploaded material.
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

              {/* Message Bubble */}
              <div className={`px-5 py-3.5 rounded-2xl max-w-[80%] shadow-lg ${
                msg.sender === 'user' 
                  ? 'bg-white/10 text-white rounded-br-sm border border-white/5' 
                  : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-bl-sm border border-purple-500/50'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isAiTyping && (
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
            placeholder="Ask ASTRA a question..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAiTyping}
            className="absolute right-2 p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-700 transition-colors text-white shadow-lg"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-500 mt-3">
          ASTRA AI can make mistakes. Check important information.
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
