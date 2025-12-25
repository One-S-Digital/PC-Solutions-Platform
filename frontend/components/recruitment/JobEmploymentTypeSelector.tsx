import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  JobEmploymentType, 
  JOB_EMPLOYMENT_TYPES 
} from '../../types';
import { 
  BriefcaseIcon, 
  ClockIcon, 
  CalendarDaysIcon 
} from '@heroicons/react/24/outline';

interface JobEmploymentTypeSelectorProps {
  value: JobEmploymentType;
  onChange: (type: JobEmploymentType) => void;
  disabled?: boolean;
}

const EMPLOYMENT_TYPE_ICONS: Record<JobEmploymentType, React.ElementType> = {
  FULL_TIME: BriefcaseIcon,
  PART_TIME: ClockIcon,
  REPLACEMENT: CalendarDaysIcon,
};

const JobEmploymentTypeSelector: React.FC<JobEmploymentTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation(['recruitment', 'common']);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {t('recruitment:jobPostModal.employmentType')}
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {JOB_EMPLOYMENT_TYPES.map((type) => {
          const Icon = EMPLOYMENT_TYPE_ICONS[type];
          const isSelected = value === type;
          
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`
                relative flex flex-col items-center p-4 rounded-lg border-2 transition-all
                focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected 
                  ? 'border-swiss-mint bg-swiss-mint/5 shadow-sm' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              {/* Selection indicator */}
              <div
                className={`
                  absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center
                  transition-colors
                  ${isSelected 
                    ? 'border-swiss-mint bg-swiss-mint' 
                    : 'border-gray-300 bg-white'
                  }
                `}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M10.28 2.28a.75.75 0 00-1.06 0L4.5 7l-1.72-1.72a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25a.75.75 0 000-1.06z" />
                  </svg>
                )}
              </div>
              
              {/* Icon */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors
                  ${isSelected ? 'bg-swiss-mint/20 text-swiss-mint' : 'bg-gray-100 text-gray-500'}
                `}
              >
                <Icon className="w-5 h-5" />
              </div>
              
              {/* Label */}
              <span
                className={`
                  text-sm font-semibold transition-colors
                  ${isSelected ? 'text-swiss-mint' : 'text-gray-900'}
                `}
              >
                {t(`recruitment:employmentTypes.${type}.label`)}
              </span>
              
              {/* Description */}
              <span className="text-xs text-gray-500 text-center mt-1 leading-tight">
                {t(`recruitment:employmentTypes.${type}.description`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default JobEmploymentTypeSelector;
