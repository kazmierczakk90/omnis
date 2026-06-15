import { motion } from 'motion/react';
import { Brain, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Timestamp } from 'firebase/firestore';

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  importance: number;
  tags: string[];
  createdAt: any;
}

interface KnowledgeFeedProps {
  items: KnowledgeItem[];
}

export default function KnowledgeFeed({ items }: KnowledgeFeedProps) {
  const getFormattedTime = (createdAt: any) => {
    if (!createdAt) {
      return 'Pending...';
    }
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {
      // ignore
    }
    return 'Pending...';
  };

  return (
    <div className="flex flex-col h-full bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Brain className="w-3 h-3" />
          Live Knowledge Feed
        </h3>
        <span className="text-[10px] text-blue-400 font-mono">
          +{items.length} NODES
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs italic font-light">
            Brak sygnałów. Trwa nasłuchiwanie w tle...
          </div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-4 rounded-xl bg-white/5 border-l-2 hover:bg-white/10 transition-colors cursor-pointer group",
                item.importance >= 4 ? "border-blue-500" : item.importance >= 2 ? "border-indigo-500" : "border-slate-700"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                  <span className="uppercase">[{item.category}]</span> 
                  <span>{getFormattedTime(item.createdAt)}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>

              <div className="text-sm text-slate-200 font-medium mb-1">
                {item.title}
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 italic font-light">
                {item.content}
              </p>
            </motion.div>
          ))
        )}
      </div>
      
      {items.length > 0 && (
         <div className="mt-4 p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 shrink-0">
           <div className="text-xs text-blue-300 font-semibold mb-1 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> System Status
           </div>
           <p className="text-[11px] text-slate-300 leading-normal italic">
             "Most recent node acquired successfully. Integrating into semantic graph."
           </p>
         </div>
      )}
    </div>
  );
}
