import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'amber' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold tracking-widest uppercase transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:border-b-0";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.4)] border-b-4 border-blue-800 hover:border-blue-600 active:translate-y-1 active:border-b-0 hover:-translate-y-0.5",
    secondary: "bg-[#1b1c23] hover:bg-[#252733] border border-white/10 text-white rounded-lg shadow-sm hover:shadow-md",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl shadow-[0_10px_30px_rgba(239,68,68,0.3)] border-b-4 border-red-800 hover:border-red-600 active:translate-y-1 active:border-b-0 hover:-translate-y-1",
    success: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] border-b-4 border-emerald-800 hover:border-emerald-600 active:translate-y-1 active:border-b-0 hover:-translate-y-1",
    amber: "bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-[0_10px_30px_rgba(245,158,11,0.4)] border-b-4 border-amber-800 hover:border-amber-700 active:translate-y-1 active:border-b-0 hover:-translate-y-1",
    ghost: "text-slate-400 hover:text-white bg-transparent normal-case font-medium tracking-normal",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base rounded-xl",
    lg: "px-10 py-4 text-xl md:text-2xl rounded-xl",
    icon: "p-2 rounded-full",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};


