
import React from 'react';
import { SettingsSectionConfig } from '../../pages/SettingsPage'; // Assuming type is exported
import { useTranslation } from 'react-i18next';

interface SettingsSidebarProps {
  sections: SettingsSectionConfig[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ sections, activeSectionId, onSelectSection }) => {
  const { t } = useTranslation();
  return (
    <nav className="w-64 bg-white border-r border-gray-200 p-4 space-y-1 overflow-y-auto flex-shrink-0">
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => onSelectSection(section.id)}
          className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-left transition-colors
            ${activeSectionId === section.id 
                ? 'bg-swiss-mint/10 text-swiss-mint' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal'
            }`}
          aria-current={activeSectionId === section.id ? 'page' : undefined}
        >
          <section.icon className={`w-5 h-5 mr-3 ${activeSectionId === section.id ? 'text-swiss-mint' : 'text-gray-400'}`} />
          {t(section.nameKey)}
        </button>
      ))}
    </nav>
  );
};

// This component is currently not directly used as its logic is within SettingsPage.tsx.
// It's provided as a structural element if refactoring for separation of concerns is desired later.
export default SettingsSidebar;