import React, { ReactNode } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick, hoverEffect = false, ...rest }) => {
  const baseClasses = 'bg-white rounded-card shadow-soft';
  const hoverClasses = hoverEffect ? 'hover:shadow-xl hover:scale-[1.015] transition-all duration-300 ease-in-out' : '';
  
  return (
    <div
      {...rest}
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {children}
    </div>
  );
};

export default Card;