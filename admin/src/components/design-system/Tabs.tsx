
import React, { useState, ReactNode, useEffect } from 'react';

interface Tab {
  label: string;
  content: ReactNode;
  icon?: React.ElementType;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  initialTab?: number;
  activeTab?: number; 
  onTabChange?: (index: number) => void;
  variant?: 'line' | 'pills';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  initialTab = 0, 
  activeTab: activeTabProp,
  onTabChange,
  variant = 'line', 
  className = '' 
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(initialTab);
  const currentActiveTab = activeTabProp !== undefined ? activeTabProp : internalActiveTab;

  useEffect(() => {
    if (activeTabProp !== undefined) {
        setInternalActiveTab(activeTabProp);
    } else if (initialTab !== internalActiveTab) { // Only reset via initialTab if uncontrolled
        setInternalActiveTab(initialTab);
    }
  }, [activeTabProp, initialTab]); // Removed internalActiveTab from deps


  const handleTabClick = (index: number) => {
    if (onTabChange) {
      onTabChange(index);
    } else {
      setInternalActiveTab(index);
    }
  };

  const baseButtonClass = "flex items-center justify-center font-medium transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-swiss-mint/50 focus:ring-offset-1";
  
  const lineVariantInactive = "border-b-2 border-transparent text-gray-500 hover:text-swiss-teal hover:border-swiss-teal/30 pb-2 px-1 mx-2";
  const lineVariantActive = "border-b-2 border-swiss-mint text-swiss-mint pb-2 px-1 mx-2";
  const lineVariantDisabled = "border-b-2 border-transparent text-gray-300 cursor-not-allowed pb-2 px-1 mx-2";

  const pillsVariantInactive = "text-gray-600 hover:bg-gray-200/70 hover:text-swiss-charcoal rounded-button px-4 py-2";
  const pillsVariantActive = "bg-swiss-mint text-white rounded-button shadow-soft px-4 py-2";
  const pillsVariantDisabled = "text-gray-300 cursor-not-allowed bg-gray-100 rounded-button px-4 py-2";


  return (
    <div className={className}>
      <div className={`flex mb-5 ${variant === 'line' ? 'border-b border-gray-200' : 'space-x-1 bg-gray-100 p-1.5 rounded-lg'}`}>
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = currentActiveTab === index;
          let buttonClass = `${baseButtonClass} text-sm`;
          
          if (tab.disabled) {
            buttonClass += ` ${variant === 'line' ? lineVariantDisabled : pillsVariantDisabled}`;
          } else if (variant === 'line') {
            buttonClass += ` ${isActive ? lineVariantActive : lineVariantInactive}`;
          } else { // pills
             buttonClass += ` ${isActive ? pillsVariantActive : pillsVariantInactive}`;
          }

          return (
            <button
              key={tab.label + index} // Ensure key is always unique even if labels are same
              className={buttonClass}
              onClick={() => !tab.disabled && handleTabClick(index)}
              disabled={tab.disabled}
              aria-selected={isActive}
              role="tab"
            >
              {Icon && <Icon className={`w-5 h-5 mr-2 ${isActive && variant === 'pills' ? 'text-white' : isActive ? 'text-swiss-mint' : (tab.disabled ? 'text-gray-300' : 'text-gray-500')}`} />}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        {tabs[currentActiveTab] && tabs[currentActiveTab].content}
      </div>
    </div>
  );
};

export default Tabs;