import React from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-surface-1 px-3 py-2 text-sm font-semibold text-text-default shadow-soft ring-1 ring-inset ring-border hover:bg-surface-2">
          <span className="text-sm">🌐</span>
          <span className="hidden sm:block">{currentLanguage?.flag}</span>
          <span className="hidden sm:block">{currentLanguage?.name}</span>
          <span className="text-sm">▼</span>
        </button>
      </div>

      <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-surface-1 shadow-pop ring-1 ring-border focus:outline-none">
        <div className="py-1">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={clsx(
                i18n.language === language.code 
                  ? 'bg-accent text-accent-contrast' 
                  : 'text-text-default hover:bg-surface-2',
                'group flex w-full items-center px-4 py-2 text-sm'
              )}
            >
              <span className="mr-3 text-lg">{language.flag}</span>
              {language.name}
              {i18n.language === language.code && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}