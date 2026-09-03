import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { BrainCircuit, Search, Database, Sparkles } from 'lucide-react';

const ProcessingLoader = () => {
  const { processingProgress, processingStatus } = useStore();

  const steps = [
    { icon: Search, text: "Scanning document contents..." },
    { icon: BrainCircuit, text: "Extracting pages & text structure..." },
    { icon: Database, text: "Categorizing into subjects..." },
    { icon: Sparkles, text: "Finalizing study workspace..." }
  ];

  // Determine current step based on progress
  const currentStepIdx = Math.min(
    Math.floor((processingProgress / 100) * steps.length),
    steps.length - 1
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full p-10 rounded-3xl border border-purple-500/30 bg-purple-900/10 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* Background Animated Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 animate-glow" />

      <div className="relative z-10 w-full max-w-md mx-auto">
        <h2 className="text-3xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          ASTRA is processing...
        </h2>
        {processingStatus && (
          <p className="text-xs text-center text-purple-300 mb-6 font-mono truncate">
            {processingStatus}
          </p>
        )}

        {/* Progress Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full mb-8 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.max(10, processingProgress)}%` }}
            transition={{ ease: "linear" }}
          />
        </div>

        {/* Dynamic Status Steps */}
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStepIdx;
            const isPast = idx < currentStepIdx;

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: isActive || isPast ? 1 : 0.3, 
                  x: 0,
                  scale: isActive ? 1.05 : 1
                }}
                className={`flex items-center p-3 rounded-xl transition-all ${
                  isActive ? 'bg-purple-500/20 border border-purple-500/30' : ''
                }`}
              >
                <div className={`
                  p-2 rounded-lg mr-4
                  ${isActive ? 'bg-purple-500 text-white animate-pulse' : 
                    isPast ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500'}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`font-medium ${
                  isActive ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {step.text}
                </span>
                
                {isPast && (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="ml-auto text-green-400"
                  >
                    ✓
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default ProcessingLoader;
