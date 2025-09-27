import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-500">Language:</span>
      <div className="flex space-x-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              i18n.language === lang.code
                ? 'bg-swiss-mint text-white'
                : 'text-gray-600 hover:text-swiss-mint hover:bg-gray-100'
            }`}
            title={lang.name}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;