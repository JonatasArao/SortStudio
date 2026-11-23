import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`min-h-[var(--studio-control-h)] bg-[var(--studio-input)] text-[var(--studio-text)] placeholder:text-[var(--studio-text-muted)] border border-[var(--studio-border-strong)] rounded-xl focus:outline-none focus:border-[var(--studio-accent)] focus:ring-2 focus:ring-[var(--studio-accent-soft)] px-3.5 py-2 text-sm transition-colors duration-150 ${className}`}
      {...props}
    />
  );
};
