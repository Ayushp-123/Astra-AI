import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, File, X, BookOpen, Layers } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { extractTextFromPDF } from '../../services/pdfService';
import { classifySubject, formatBytes } from '../../utils/helpers';
import ProcessingLoader from './ProcessingLoader';

const UploadArea = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { 
    documents, addDocument, removeDocument,
    addOrUpdateSubject,
    processing, setProcessing, 
    setProcessingProgress, setProcessingStatus 
  } = useStore();

  const processFiles = useCallback(async (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus("Initializing extraction...");

    const total = uploadedFiles.length;

    for (let i = 0; i < total; i++) {
      const file = uploadedFiles[i];
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        setProcessingStatus(`Extracting ${file.name}...`);

        const extraction = await extractTextFromPDF(file, (fileProgress) => {
          const baseProgress = (i / total) * 100;
          const currentFilePortion = fileProgress * (1 / total);
          setProcessingProgress(Math.min(99, Math.round(baseProgress + currentFilePortion)));
        });

        // Determine subject for this individual document
        const subjectName = classifySubject(file.name, extraction.fullText.slice(0, 1000));
        const subjectId = subjectName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const doc = {
          id: docId,
          name: file.name,
          size: file.size,
          pageCount: extraction.pageCount,
          subjectId: subjectId,
          subjectName: subjectName,
          fullText: extraction.fullText,
          chunks: extraction.chunks,
          uploadedAt: new Date().toISOString(),
          status: extraction.hasExtractableText ? 'ready' : 'empty',
          error: extraction.error || null
        };

        // Add document to store & link to subject
        addDocument(doc);
        addOrUpdateSubject(subjectName, docId);
      }
    }

    // Completion transition
    setProcessingProgress(100);
    setProcessingStatus("Completed!");
    setTimeout(() => {
      setProcessing(false);
    }, 600);
  }, [addDocument, addOrUpdateSubject, setProcessing, setProcessingProgress, setProcessingStatus]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  if (processing) {
    return <ProcessingLoader />;
  }

  return (
    <div className="w-full">
      <motion.label
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          flex flex-col items-center justify-center w-full h-72 rounded-3xl border-2 border-dashed 
          transition-all duration-300 cursor-pointer overflow-hidden relative
          ${isDragging 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
          }
        `}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 relative z-10">
          <motion.div
            animate={{ y: isDragging ? -10 : 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <UploadCloud className={`w-16 h-16 mb-4 ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2 text-white">
            {isDragging ? 'Drop it here!' : 'Drop your study material here'}
          </h2>
          <p className="text-gray-400 mb-4">
            PDF lecture notes, textbooks, slides and documents
          </p>
          <div className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 transition font-medium shadow-lg shadow-purple-500/20 text-sm">
            Browse Files
          </div>
        </div>
        <input 
          type="file" 
          className="hidden" 
          multiple 
          accept=".pdf"
          onChange={handleFileInput} 
        />
        
        {/* Glow effect */}
        {isDragging && (
          <div className="absolute inset-0 bg-purple-500/5 blur-3xl rounded-3xl" />
        )}
      </motion.label>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center text-gray-300">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              Uploaded Documents ({documents.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all group"
              >
                <div className="flex items-center overflow-hidden mr-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 mr-3 flex-shrink-0">
                    <File className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-white truncate" title={doc.name}>{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span>{formatBytes(doc.size)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-gray-500" />
                        {doc.pageCount} p.
                      </span>
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-purple-300">
                      <BookOpen className="w-3 h-3" />
                      {doc.subjectName}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => removeDocument(doc.id)}
                  title="Remove document"
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UploadArea;

