import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

// Flag Icons
const UKFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="20" height="14" {...props}>
    <clipPath id="t">
      <path d="M0 0v30h60V0z" />
    </clipPath>
    <path d="M0 0v30h60V0z" fill="#012169" />
    <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" clipPath="url(#t)" />
    <path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" strokeWidth="4" clipPath="url(#t)" />
    <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" clipPath="url(#t)" />
    <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" clipPath="url(#t)" />
  </svg>
);

const FrenchFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="20" height="14" {...props}>
    <rect width="300" height="600" fill="#002654" />
    <rect x="300" width="300" height="600" fill="#fff" />
    <rect x="600" width="300" height="600" fill="#ED2939" />
  </svg>
);

const GermanFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3" width="20" height="14" {...props}>
    <rect width="5" height="3" fill="#000" />
    <rect width="5" height="2" y="1" fill="#D00" />
    <rect width="5" height="1" y="2" fill="#FFCE00" />
  </svg>
);

const languages = [
  { code: 'en', name: 'English', shortName: 'EN', flag: UKFlagIcon },
  { code: 'fr', name: 'Français', shortName: 'FR', flag: FrenchFlagIcon },
  { code: 'de', name: 'Deutsch', shortName: 'DE', flag: GermanFlagIcon },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const CurrentFlagIcon = currentLanguage.flag;

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

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <CurrentFlagIcon className="w-5 h-auto mr-2" />
          <span className="hidden sm:block">{currentLanguage.shortName}</span>
          <ChevronDownIcon className="ml-1.5 h-4 w-4 text-gray-400" />
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu">
            {languages.map((language) => {
              const FlagIcon = language.flag;
              const isCurrent = i18n.language === language.code;
              return (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`${
                    isCurrent ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700'
                  } group flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900`}
                  role="menuitem"
                >
                  <FlagIcon className="w-5 h-auto mr-3" />
                  {language.name} ({language.shortName})
                  {isCurrent && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}