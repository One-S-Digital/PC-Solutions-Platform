
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { SupportedLanguage } from '../../types';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { UKFlagIcon, FrenchFlagIcon, GermanFlagIcon } from '../icons/CustomIcons';
import { useTranslation } from 'react-i18next'; 

const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation('common');
  const { language, setLanguage } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Intentionally hardcoded labels (do not translate)
  const languages: { code: SupportedLanguage; name: string; flag: React.ElementType }[] = [
    { code: 'EN', name: 'English', flag: UKFlagIcon },
    { code: 'FR', name: 'Français', flag: FrenchFlagIcon },
    { code: 'DE', name: 'Deutsch', flag: GermanFlagIcon },
  ];

  const currentLanguageDetails = languages.find(lang => lang.code === language) || languages[0];
  const CurrentFlagIcon = currentLanguageDetails.flag;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageSelect = (langCode: SupportedLanguage) => {
    setLanguage(langCode); 
    setIsOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-button border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-1"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t('languageSwitcher.selectLanguage', { currentLanguage: currentLanguageDetails.name })}
      >
        <CurrentFlagIcon className="h-4 w-5 flex-shrink-0" />
        <span className="hidden sm:inline">{currentLanguageDetails.code}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
      </button>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {languages.map((lang) => {
              const FlagIcon = lang.flag;
              const isCurrent = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`${
                    isCurrent ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700'
                  } group flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900`}
                  role="menuitem"
                  aria-current={isCurrent ? "page" : undefined}
                >
                  <FlagIcon className="h-4 w-5 flex-shrink-0 mr-2.5" />
                  {lang.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
