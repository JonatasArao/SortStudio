import { X, Users } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';
import { EntriesTab } from './sidebar/EntriesTab';

export const Sidebar = () => {
  const { t } = useTranslation();
  const isSidebarOpen = useAppStore(s => s.isSidebarOpen);
  const setIsSidebarOpen = useAppStore(s => s.setIsSidebarOpen);
  const items = useAppStore(s => s.items);

  const activeCount = items.filter(i => i.enabled !== false && i.text.trim() !== '').length;

  return (
    <>
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-30 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={t('sidebar.entries.participants', 'Participantes')}
        className={`
          fixed lg:relative right-0 top-14 sm:top-16 lg:top-0 bottom-0 lg:h-full z-40 shrink-0
          transition-[transform,width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${
            isSidebarOpen
              ? 'translate-x-0 w-[90vw] max-w-[390px] lg:w-[370px] xl:w-[400px]'
              : 'translate-x-full lg:translate-x-0 w-[90vw] max-w-[390px] lg:w-0 overflow-hidden'
          }
        `}
      >
        <div className="w-full lg:w-[370px] xl:w-[400px] h-full bg-[var(--studio-surface)] border-l border-[var(--studio-border)] flex flex-col transition-colors duration-300">
          {/* Panel Header */}
          <div className="px-4 sm:px-5 h-13 border-b border-[var(--studio-border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Users size={16} className="text-[var(--studio-accent-fg)] shrink-0" />
              <h2 className="font-display text-sm font-bold text-[var(--studio-text)] truncate">
                {t('sidebar.entries.participants', 'Participantes')}
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--studio-text-muted)]">
                · {activeCount}/{items.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card)] transition-colors"
              title={t('sidebar.hidePanel')}
              aria-label={t('sidebar.hidePanel')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 sm:px-5 pt-4 pb-4 flex-1 flex flex-col overflow-hidden min-h-0">
            <EntriesTab />
          </div>
        </div>
      </aside>
    </>
  );
};
