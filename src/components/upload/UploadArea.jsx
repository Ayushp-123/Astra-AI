import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, File, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { extractTextFromPDF } from '../../services/pdfService';
import { detectSubjects, formatBytes } from '../../utils/helpers';
import ProcessingLoader from './ProcessingLoader';

const UploadArea = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { 
    files, addFiles, setFiles, 
    processing, setProcessing, 
    setProcessingProgress, 
    setSubjects, setNotesText 
  } = useStore();

  const processFiles = async (uploadedFiles) => {
    addFiles(uploadedFiles);
    setProcessing(true);
    setProcessingProgress(0);

    let extractedText = "";
    
    // Process files one by one to avoid UI freeze
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(file, (progress) => {
          // Normalize progress across all files
          const baseProgress = (i / uploadedFiles.length) * 100;
          const fileProgress = progress * (1 / uploadedFiles.length);
          setProcessingProgress(baseProgress + fileProgress);
        });
        extractedText += text + "\n\n";
      }
    }

    setNotesText(extractedText);
    const generatedSubjects = detectSubjects(files.concat(uploadedFiles));
    setSubjects(generatedSubjects);
    
    // Finish
    setProcessingProgress(100);
    setTimeout(() => {
      setProcessing(false);
    }, 800);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [files]);

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

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, idx) => idx !== indexToRemove));
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
            PDFs, screenshots, notes and documents
          </p>
          <div className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 transition font-medium shadow-lg shadow-purple-500/20">
            Browse Files
          </div>
        </div>
        <input 
          type="file" 
          className="hidden" 
          multiple 
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          onChange={handleFileInput} 
        />
        
        {/* Glow effect */}
        {isDragging && (
          <div className="absolute inset-0 bg-purple-500/5 blur-3xl rounded-3xl" />
        )}
      </motion.label>

      {/* Uploaded Files Preview */}
      {files.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-300">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            Ready to Process ({files.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group">
                <div className="flex items-center overflow-hidden">
                  <File className="w-8 h-8 text-blue-400 mr-3 flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeFile(idx)}
                  className="p-1.5 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
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
