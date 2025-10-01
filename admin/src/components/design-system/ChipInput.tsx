
import React, { useState, KeyboardEvent } from 'react';
import { XCircleIcon } from '@heroicons/react/20/solid';
import { STANDARD_INPUT_FIELD } from '../../constants';

interface ChipInputProps<T extends string> {
  selectedChips: T[];
  availableOptions?: T[]; // If provided, input acts as a selector/adder
  onChange: (newChips: T[]) => void;
  placeholder?: string;
  maxChips?: number;
  allowCustomValues?: boolean; // If true and no availableOptions, input acts as a tag adder
}

const ChipInput = <T extends string>({
  selectedChips,
  availableOptions,
  onChange,
  placeholder = "Type or select...",
  maxChips,
  allowCustomValues = !availableOptions // Default to true if no options are provided
}: ChipInputProps<T>): JSX.Element => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddChip = (chipValue: T) => {
    if (chipValue && !selectedChips.includes(chipValue) && (!maxChips || selectedChips.length < maxChips)) {
      onChange([...selectedChips, chipValue]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveChip = (chipToRemove: T) => {
    onChange(selectedChips.filter(chip => chip !== chipToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue && allowCustomValues) {
      e.preventDefault();
      handleAddChip(inputValue as T);
    } else if (e.key === 'Backspace' && !inputValue && selectedChips.length > 0) {
      handleRemoveChip(selectedChips[selectedChips.length - 1]);
    }
  };

  const filteredSuggestions = availableOptions
    ? availableOptions.filter(
        option =>
          !selectedChips.includes(option) &&
          option.toLowerCase().includes(inputValue.toLowerCase())
      )
    : [];

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-md bg-white min-h-[40px]">
        {selectedChips.map(chip => (
          <span
            key={chip}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-swiss-teal/20 text-swiss-teal"
          >
            {chip}
            <button
              type="button"
              onClick={() => handleRemoveChip(chip)}
              className="ml-1.5 flex-shrink-0 text-swiss-teal hover:text-opacity-70 focus:outline-none"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} // Delay to allow click on suggestions
          placeholder={selectedChips.length === 0 ? placeholder : ''}
          className="flex-grow p-0.5 border-none focus:ring-0 focus:outline-none text-sm placeholder-gray-400"
          disabled={maxChips !== undefined && selectedChips.length >= maxChips}
        />
      </div>
      {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map(suggestion => (
            <li
              key={suggestion}
              onMouseDown={() => handleAddChip(suggestion)} // Use onMouseDown to fire before onBlur
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChipInput;
