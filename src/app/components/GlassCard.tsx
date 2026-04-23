import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hover = false }) => {
  return (
    <div
      className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 ${
        hover ? 'hover:shadow-xl transition-all duration-300 hover:-translate-y-1' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
