import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';

export const EliminationFeed = () => {
  const { t } = useTranslation();
  const winner = useAppStore(s => s.winner);
  const eliminationMessage = useAppStore(s => s.eliminationMessage) || t('eliminationFeed.eliminated');
  const [feed, setFeed] = useState<{ id: string; text: string }[]>([]);
  const timeoutRefs = useRef<{ [id: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      timeoutRefs.current = {};
    };
  }, []);

  useEffect(() => {
    if (winner && winner.isEliminated) {
      const newEntry = {
        id: crypto.randomUUID(),
        text: winner.text,
      };
      setFeed(prev => [...prev, newEntry]);

      const timeoutId = setTimeout(() => {
        setFeed(prev => prev.filter(item => item.id !== newEntry.id));
        delete timeoutRefs.current[newEntry.id];
      }, 5000);

      timeoutRefs.current[newEntry.id] = timeoutId;
    }
  }, [winner]);

  if (feed.length === 0) return null;

  return (
    <div
      className="absolute bottom-20 left-3 sm:bottom-6 sm:left-6 w-64 sm:w-72 flex flex-col gap-2 justify-end pointer-events-none z-50 overflow-hidden"
      style={{ maxHeight: '280px' }}
    >
      <AnimatePresence>
        {feed.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
            layout
            className="bg-[var(--studio-surface)]/95 text-[var(--studio-text)] px-3.5 py-2.5 rounded-xl shadow-xl border border-red-500/35 backdrop-blur-md self-start shrink-0 max-w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <Skull size={16} className="text-red-600 dark:text-red-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold truncate text-sm text-[var(--studio-text)] max-w-[170px] sm:max-w-[190px]">
                  {item.text}
                </span>
                <span className="text-[11px] text-red-600 dark:text-red-400 font-medium leading-tight">
                  {eliminationMessage}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
