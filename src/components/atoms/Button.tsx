import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'amber' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold whitespace-nowrap shrink-0 transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none';

  const variants = {
    primary:
      'bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] text-[var(--studio-accent-text)] rounded-xl border border-transparent shadow-sm',
    secondary:
      'bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] rounded-xl border border-[var(--studio-border-strong)] shadow-sm',
    danger:
      'bg-red-600 hover:bg-red-500 text-white rounded-xl border border-red-400/25 shadow-sm',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl border border-emerald-400/25 shadow-sm',
    amber:
      'bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl border border-amber-300/30 shadow-sm',
    ghost:
      'bg-transparent hover:bg-[var(--studio-accent-soft)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] rounded-xl border border-transparent',
  };

  const sizes = {
    sm: 'min-h-[calc(var(--studio-control-h)-4px)] px-3.5 text-xs gap-1.5',
    md: 'min-h-[var(--studio-control-h)] px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
    icon: 'w-10 h-10 p-0 rounded-xl',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
