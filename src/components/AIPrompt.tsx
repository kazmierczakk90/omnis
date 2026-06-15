import { useState } from 'react';
import { Search, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface AIPromptProps {
  onQuery: (query: string) => Promise<string>;
}

export default function AIPrompt({ onQuery }: AIPromptProps) {
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isQuerying) return;

    setIsQuerying(true);
    try {
      const res = await onQuery(query);
      setResponse(res);
      setQuery('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Manual Query Override..."
          className="w-full h-12 bg-black/20 border border-white/10 rounded-xl pl-10 pr-12 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-blue-900/10 transition-colors text-slate-200 placeholder:text-slate-500"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <button
          type="submit"
          disabled={!query.trim() || isQuerying}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white disabled:opacity-50 disabled:bg-white/10 transition-all shadow-[0_0_10px_rgba(37,99,235,0.4)]"
        >
          {isQuerying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl mt-4"
          >
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="space-y-1">
                 <div className="text-[10px] uppercase tracking-wider font-mono text-blue-400/70">Neural Response</div>
                 <div className="markdown-body text-slate-300 prose prose-invert max-w-none prose-sm leading-relaxed font-light">
                    <ReactMarkdown>{response}</ReactMarkdown>
                 </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setResponse(null)}
                className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors font-mono"
              >
                Clear Output
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
