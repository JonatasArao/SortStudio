import React from 'react';

export const Confetti = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden flex justify-center">
      {Array.from({ length: 80 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 md:w-4 md:h-4 opacity-0 animate-[confetti_3s_ease-out_forwards]"
          style={{
            left: `${Math.random() * 100}vw`,
            top: `-10vh`,
            backgroundColor: ['#fcd34d', '#ea580c', '#3b82f6', '#10b981', '#f43f5e', '#a855f7'][Math.floor(Math.random() * 6)],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 3}s`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
