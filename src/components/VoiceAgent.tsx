import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface VoiceAgentProps {
  onKnowledgeAdquired: (input: string) => Promise<void>;
  isProcessing: boolean;
}

export default function VoiceAgent({ onKnowledgeAdquired, isProcessing }: VoiceAgentProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef(transcript);
  const onKnowledgeRef = useRef(onKnowledgeAdquired);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    onKnowledgeRef.current = onKnowledgeAdquired;
  }, [onKnowledgeAdquired]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pl-PL';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Ignore no-speech error to prevent it from showing up in the console
          return;
        }
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        const finalTranscript = transcriptRef.current;
        if (finalTranscript.trim()) {
          onKnowledgeRef.current(finalTranscript);
          setTranscript('');
        }
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start speech recognition", e);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative p-8">
      <div className="relative flex items-center justify-center w-[320px] h-[320px]">
        {/* Ambient Glows */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-[60px]"></div>
        {isListening && <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-[80px] animate-pulse"></div>}
        
        {/* Core Ring Structure */}
        <div className="w-64 h-64 rounded-full border border-blue-400/30 bg-black/40 backdrop-blur-2xl flex items-center justify-center relative shadow-[0_0_50px_rgba(37,99,235,0.1)]">
          
          <div className="w-48 h-48 rounded-full border border-white/10 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-32 h-32 rounded-full border-2 border-dashed border-blue-500/50 absolute" 
            />
            <motion.button 
               animate={isListening ? { scale: [1, 1.1, 1] } : {}}
               transition={{ duration: 1.5, repeat: Infinity }}
               className={cn(
                 "w-24 h-24 rounded-full flex items-center justify-center relative z-10 transition-colors duration-500 cursor-pointer overflow-hidden group",
                 isListening ? "bg-blue-600 shadow-[0_0_30px_#2563eb]" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white"
               )}
               onClick={toggleListening}
               disabled={isProcessing}
            >
               {isProcessing ? (
                 <Loader2 className="w-8 h-8 animate-spin text-white" />
               ) : isListening ? (
                 <Mic className="w-8 h-8 text-white relative z-10" />
               ) : (
                 <div className="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <MicOff className="w-6 h-6" />
                    <span className="text-[9px] uppercase font-bold tracking-widest text-center leading-none mt-1">Idle</span>
                 </div>
               )}
            </motion.button>
          </div>
          
          {/* Status Text Overlay */}
          {!isListening && !isProcessing && (
             <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center pointer-events-none">
               <div className="text-[10px] text-blue-400 font-mono">ID: X-900-ALPHA</div>
             </div>
          )}
        </div>
        
        {/* Orbiting Data Points */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-10 right-20 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_white]"></div>
          <div className="absolute bottom-20 left-10 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa]"></div>
        </motion.div>
      </div>

      <div className="mt-8 h-20 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {transcript ? (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-md text-center bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl"
            >
              <p className="text-sm font-light text-blue-100 italic">
                "{transcript}"
              </p>
            </motion.div>
          ) : isProcessing ? (
            <motion.div
               key="processing"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="flex items-center gap-2 text-blue-400 text-xs tracking-widest uppercase font-mono"
            >
              <Sparkles className="w-3 h-3 animate-pulse" />
              Syntetyzowanie wiedzy...
            </motion.div>
          ) : (
            <motion.p 
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-slate-400 max-w-sm mx-auto text-xs leading-relaxed font-light text-center"
            >
              Neural agent is processing environmental stimuli and constructing semantic links in real-time. Click node to initiate audio transfer.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
