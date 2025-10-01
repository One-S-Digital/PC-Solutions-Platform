
import React from 'react';

interface RadioOption<T extends string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

interface RadioPillsProps<T extends string | number> {
  options: RadioOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  name?: string; // For ARIA or form submission if needed
}

const RadioPills = <T extends string | number>({ options, selectedValue, onChange, name }: RadioPillsProps<T>): JSX.Element => {
  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value.toString()}
          type="button"
          role="radio"
          aria-checked={selectedValue === option.value}
          aria-disabled={option.disabled}
          disabled={option.disabled}
          onClick={() => !option.disabled && onChange(option.value)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-swiss-mint/50
            ${selectedValue === option.value
              ? 'bg-swiss-mint text-white shadow-sm'
              : `text-gray-600 hover:bg-gray-200/70 hover:text-swiss-charcoal ${option.disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default RadioPills;
