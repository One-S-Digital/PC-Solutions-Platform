
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available languages for admin
  const languages: { code: 'EN' | 'FR' | 'DE'; labelKey: string; nameKey: string }[] = [
    { code: 'EN', labelKey: 'languageSwitcher.enShort', nameKey: 'languageSwitcher.enLong' },
    { code: 'FR', labelKey: 'languageSwitcher.frShort', nameKey: 'languageSwitcher.frLong' },
    { code: 'DE', labelKey: 'languageSwitcher.deShort', nameKey: 'languageSwitcher.deLong' },
  ];

  const currentCode = (i18n.language || 'en').toUpperCase().slice(0, 2) as 'EN' | 'FR' | 'DE';
  const currentLanguageDetails = languages.find((l) => l.code === currentCode) || languages[0];

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

  const handleLanguageSelect = (langCode: 'EN' | 'FR' | 'DE') => {
    const code = langCode.toLowerCase();
    i18n.changeLanguage(code);
    try {
      localStorage.setItem('admin_lang', code);
    } catch {}
    setIsOpen(false);
  };
  
  const getLabel = (lang: typeof languages[0]) => {
    // Fallback to code if key not found or t function not ready
    return t(lang.labelKey, lang.code);
  };
  
  const getName = (lang: typeof languages[0]) => {
    return t(lang.nameKey, lang.code);
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          className="inline-flex items-center justify-center w-full rounded-button border border-gray-300 shadow-sm px-3 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-swiss-mint"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label={t('languageSwitcher.selectLanguage', { currentLanguage: getName(currentLanguageDetails) })}
        >
          {getLabel(currentLanguageDetails)}
          <ChevronDownIcon className="ml-1.5 h-5 w-5 text-gray-400" />
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {languages.map((lang) => {
              const isCurrent = currentCode === lang.code;
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
                  {getName(lang)} ({getLabel(lang)})
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
