import { create } from 'zustand';

export const useStore = create((set) => ({
  // Upload State
  files: [],
  setFiles: (files) => set({ files }),
  addFiles: (newFiles) => set((state) => ({ files: [...state.files, ...newFiles] })),
  
  processing: false,
  setProcessing: (processing) => set({ processing }),
  
  processingProgress: 0,
  setProcessingProgress: (progress) => set({ processingProgress: progress }),

  // Subjects Data
  subjects: [],
  setSubjects: (subjects) => set({ subjects }),
  selectedSubject: null,
  setSelectedSubject: (subject) => set({ selectedSubject: subject }),
  
  // Note content for selected subject
  notesText: "",
  setNotesText: (text) => set({ notesText: text }),

  // Chat State
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  
  isAiTyping: false,
  setIsAiTyping: (isTyping) => set({ isAiTyping: isTyping }),

  // Additional Data
  keyPoints: [],
  setKeyPoints: (points) => set({ keyPoints: points }),
  
  quiz: null,
  setQuiz: (quiz) => set({ quiz }),
}));
