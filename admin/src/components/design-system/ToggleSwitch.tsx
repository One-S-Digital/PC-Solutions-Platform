
import React from 'react';

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange, label, disabled = false }) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label htmlFor={id} className={`flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="relative">
        <input 
          type="checkbox" 
          id={id} 
          className="sr-only" 
          checked={checked} 
          onChange={handleToggle} 
          disabled={disabled}
        />
        <div className={`block w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked && !disabled ? 'bg-swiss-mint' : 'bg-gray-300'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${checked ? 'transform translate-x-5' : ''}`}></div>
      </div>
      {label && <span className={`ml-3 text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>}
    </label>
  );
};

export default ToggleSwitch;
