import React from 'react';
import { format } from 'date-fns';

interface CantonCardProps {
  code: string;
  name: string;
  count: number;
  lastUpdated?: string;
  isSelected: boolean;
  onClick: () => void;
}

export const CantonCard: React.FC<CantonCardProps> = ({
  code,
  name,
  count,
  lastUpdated,
  isSelected,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        p-3 rounded-lg border-2 text-left transition-all
        focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2
        ${isSelected 
          ? 'border-swiss-teal bg-swiss-teal/10' 
          : 'border-gray-200 hover:border-swiss-teal/50 hover:bg-gray-50'
        }
      `}
      aria-pressed={isSelected}
    >
      {/* Canton Code Badge */}
      <div className={`
        inline-block px-2 py-0.5 rounded text-xs font-bold mb-1
        ${isSelected ? 'bg-swiss-teal text-white' : 'bg-gray-200 text-gray-700'}
      `}>
        {code}
      </div>
      
      {/* Canton Name - truncated on mobile */}
      <p className="font-medium text-sm text-gray-900 truncate" title={name}>
        {name}
      </p>
      
      {/* Document Count */}
      <p className="text-xs text-gray-500 mt-1">
        {count} {count === 1 ? 'document' : 'documents'}
      </p>
      
      {/* Last Updated - hidden on mobile for space */}
      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
          Updated {format(new Date(lastUpdated), 'MMM d')}
        </p>
      )}
    </button>
  );
};

