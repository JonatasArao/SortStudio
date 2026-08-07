import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange }) => {
  return (
    <button
      onClick={() => onChange(!enabled)}
      type="button"
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 hover:opacity-95 ${enabled ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20" : "bg-slate-700 border border-slate-600/40"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
};
