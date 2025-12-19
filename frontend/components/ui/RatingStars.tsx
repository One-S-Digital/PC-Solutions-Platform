import React from 'react';
import { StarIcon } from '@heroicons/react/24/outline';

interface RatingStarsProps {
  rating?: number;
  totalStars?: number;
  showNumeric?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Shared component for displaying star ratings with half-star support
 */
const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  totalStars = 5,
  showNumeric = true,
  size = 'sm',
  className = '',
}) => {
  const fullStars = Math.floor(rating || 0);
  const hasHalfStar = (rating || 0) % 1 >= 0.5;
  const emptyStars = totalStars - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSize = sizeClasses[size];

  return (
    <div 
      className={`flex items-center ${className}`}
      aria-label={rating ? `Rating: ${rating.toFixed(1)} out of ${totalStars} stars` : 'No rating'}
    >
      {/* Full stars */}
      {[...Array(fullStars)].map((_, i) => (
        <StarIcon
          key={`full-${i}`}
          className={`${iconSize} text-yellow-400 fill-yellow-400`}
          aria-hidden="true"
        />
      ))}
      
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative" aria-hidden="true">
          <StarIcon className={`${iconSize} text-gray-300`} />
          <StarIcon
            className={`${iconSize} text-yellow-400 fill-yellow-400 absolute inset-0`}
            style={{ clipPath: 'inset(0 50% 0 0)' }}
          />
        </div>
      )}
      
      {/* Empty stars */}
      {[...Array(emptyStars)].map((_, i) => (
        <StarIcon
          key={`empty-${i}`}
          className={`${iconSize} text-gray-300`}
          aria-hidden="true"
        />
      ))}
      
      {/* Numeric rating */}
      {showNumeric && rating !== undefined && (
        <span className="ml-1.5 text-xs text-gray-500">
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
};

export default RatingStars;
