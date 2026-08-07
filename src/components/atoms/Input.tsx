import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // Can extend in the future
}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`bg-slate-950/45 text-white border border-slate-800/80 rounded-xl focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 px-4 py-3 text-sm transition-all shadow-inner ${className}`}
      {...props}
    />
  );
};
