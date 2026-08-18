import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';

export const EliminationFeed = () => {
  const { t } = useTranslation();
  const winner = useAppStore(s => s.winner);
  const eliminationMessage = useAppStore(s => s.eliminationMessage) || t('eliminationFeed.eliminated');
  const [feed, setFeed] = useState<{ id: string; text: string; eliminatedAt: number }[]>([]);
  const timeoutRefs = useRef<{ [id: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    if (winner && winner.isEliminated) {
      const newEntry = {
        id: crypto.randomUUID(),
        text: winner.text,
        eliminatedAt: Date.now(),
      };
      setFeed(prev => [...prev, newEntry]);
      
      const timeoutId = setTimeout(() => {
        setFeed(prev => prev.filter(item => item.id !== newEntry.id));
      }, 5000); 
      
      timeoutRefs.current[newEntry.id] = timeoutId;
    }
  }, [winner]);
  
  return (
    <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 w-60 xs:w-68 sm:w-72 flex flex-col gap-1.5 sm:gap-2 justify-end pointer-events-none z-50 overflow-hidden" style={{ maxHeight: '320px' }}>
      <AnimatePresence>
        {feed.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
            layout
            className="bg-slate-950/90 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.15)] border border-red-500/35 backdrop-blur-md self-start shrink-0 max-w-full"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">💀</span>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold truncate text-xs sm:text-sm drop-shadow-md max-w-[140px] sm:max-w-[180px]">{item.text}</span>
                <span className="text-[9px] sm:text-[10px] text-red-400 font-bold tracking-wider uppercase mt-0.5">{eliminationMessage}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
