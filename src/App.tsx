import { useEffect, useState } from 'react';
import { 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, auth, signIn, signOut } from './lib/firebase';
import VoiceAgent from './components/VoiceAgent';
import KnowledgeFeed from './components/KnowledgeFeed';
import AIPrompt from './components/AIPrompt';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LogOut, Cpu, Fingerprint, Layers } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return auth.onAuthStateChanged(async (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        // Ensure user record exists
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef).catch((e) => {
          handleFirestoreError(e, OperationType.GET, `users/${u.uid}`);
          throw e;
        });
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            displayName: u.displayName || 'No Name',
            email: u.email || '',
            createdAt: serverTimestamp()
          }).catch((e) => {
            handleFirestoreError(e, OperationType.CREATE, `users/${u.uid}`);
            throw e;
          });
        }

        // Sub to knowledge
        const kQuery = query(
          collection(db, 'users', u.uid, 'knowledge'),
          orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(kQuery, (snapshot) => {
          setKnowledge(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${u.uid}/knowledge`);
        });

        return unsubscribe;
      }
    });
  }, []);

  const handleKnowledgeAdquired = async (input: string) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      // Process with Gemini on server
      const response = await fetch('/api/gemini/process-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, context: knowledge.slice(0, 5) })
      });
      
      const data = await response.json();
      
      // Store in Firestore
      const path = `users/${user.uid}/knowledge`;
      await addDoc(collection(db, 'users', user.uid, 'knowledge'), {
        userId: user.uid,
        title: data.title || 'Untitled',
        category: data.category || 'Personal',
        content: data.content || '',
        importance: typeof data.importance === 'number' ? data.importance : 3,
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch((e) => {
        handleFirestoreError(e, OperationType.CREATE, path);
        throw e;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuery = async (query: string) => {
    if (!user) return '';
    try {
      const response = await fetch('/api/gemini/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          knowledgeBase: knowledge.map(k => ({ title: k.title, content: k.content, category: k.category }))
        })
      });
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error(error);
      return 'Coś poszło nie tak podczas zapytania.';
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Cpu className="w-12 h-12 text-atmosphere-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col overflow-hidden bg-[#020617] text-slate-200 font-sans">
      <div className="atmosphere-bg" />
      <div className="atmosphere-dots" />
      
      <header className="h-16 shrink-0 flex items-center justify-between px-8 border-b border-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center">
              OMNIS<span className="font-light text-slate-400 text-xs ml-1">v2.4</span>
            </h1>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-medium text-green-400 uppercase tracking-widest">Background Active</span>
            </div>
            <button onClick={() => signOut()} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-mono">
              <LogOut className="w-3 h-3" />
              {user.displayName?.split(' ')[0]}
            </button>
          </div>
        ) : (
          <button onClick={() => signIn()} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-mono">
            <LogIn className="w-3 h-3" />
            Zaloguj
          </button>
        )}
      </header>

      {!user ? (
        <main className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 space-y-6"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 blur-[20px] absolute left-1/2 -top-4 -translate-x-1/2" />
            <Layers className="w-16 h-16 text-blue-500 mx-auto relative z-10" />
            <h2 className="text-4xl font-bold tracking-tight text-white leading-tight relative z-10">
              Twój osobisty <span className="text-blue-500">cyfrowy ustrój.</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto relative z-10">
              Zaloguj się, aby zsynchronizować rdzeń neuronowy i umożliwić analizę kontekstową w czasie rzeczywistym.
            </p>
            <button 
              onClick={() => signIn()} 
              className="glass-button bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest text-xs uppercase border-blue-400/30 px-12 py-4 relative z-10 mt-8"
            >
              Ustanów połączenie
            </button>
          </motion.div>
        </main>
      ) : (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-8 z-10 overflow-hidden">
          {/* Left Panel: Context Awareness */}
          <section className="col-span-1 lg:col-span-3 flex flex-col gap-6 overflow-y-auto pb-8 custom-scrollbar">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Input Channels</h3>
              <AIPrompt onQuery={handleQuery} />
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 flex-1">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Core Metrics</h3>
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs mb-1 text-slate-300">
                    <span>Synthesizing Confidence</span>
                    <span className="text-blue-400">98.4%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-[98.4%] h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <div className="text-xl font-bold text-white">{knowledge.length}</div>
                    <div className="text-[9px] uppercase tracking-tighter text-slate-500 mt-1">Nodes</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <div className="text-xl font-bold text-white">4ms</div>
                    <div className="text-[9px] uppercase tracking-tighter text-slate-500 mt-1">Latency</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Center Panel: The Agent Core */}
          <section className="col-span-1 lg:col-span-6 flex flex-col items-center justify-center relative bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden min-h-[400px]">
             <VoiceAgent 
              onKnowledgeAdquired={handleKnowledgeAdquired} 
              isProcessing={isProcessing} 
            />
          </section>

          {/* Right Panel: Knowledge Stream */}
          <section className="col-span-1 lg:col-span-3 flex flex-col gap-4 overflow-hidden">
            <KnowledgeFeed items={knowledge} />
          </section>
        </main>
      )}

      <footer className="h-12 shrink-0 px-8 flex items-center justify-between bg-black/50 border-t border-white/5 backdrop-blur-md z-10">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
             <span className="text-[9px] uppercase tracking-wider text-slate-500">Network</span>
             <span className="text-xs text-white font-mono">STABLE / 5G</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[9px] uppercase tracking-wider text-slate-500">Encryption</span>
             <span className="text-xs text-white font-mono uppercase">End-to-End</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
