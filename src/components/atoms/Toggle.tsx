import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  ariaLabel?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, ariaLabel }) => {
  return (
    <button
      onClick={() => onChange(!enabled)}
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 ${
        enabled
          ? 'bg-[var(--studio-accent)] border-transparent'
          : 'bg-[var(--studio-card)] border-[var(--studio-border-strong)] hover:border-[var(--studio-accent)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform duration-150 ${
          enabled
            ? 'translate-x-6 bg-[var(--studio-accent-text)]'
            : 'translate-x-1 bg-[var(--studio-text-muted)] dark:bg-slate-200'
        }`}
      />
    </button>
  );
};
