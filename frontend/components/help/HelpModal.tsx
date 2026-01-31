import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import {
  HelpArticle,
  HelpCategory,
  HELP_CATEGORIES,
  getArticlesForRole,
  getCategoriesForRole,
  searchArticles,
} from './helpContent';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['help', 'common']);
  const { currentUser } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get role-filtered content
  const availableCategories = useMemo(
    () => getCategoriesForRole(currentUser?.role),
    [currentUser?.role]
  );
  
  const availableArticles = useMemo(
    () => getArticlesForRole(currentUser?.role),
    [currentUser?.role]
  );

  // Filter articles based on search and category
  const filteredArticles = useMemo(() => {
    let articles = availableArticles;
    
    // Filter by category if selected
    if (selectedCategory) {
      articles = articles.filter(a => a.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      articles = searchArticles(articles, searchQuery, t);
    }
    
    return articles;
  }, [availableArticles, selectedCategory, searchQuery, t]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory(null);
      setSelectedArticle(null);
      setIsMobileMenuOpen(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedArticle) {
          setSelectedArticle(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, selectedArticle, onClose]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (selectedArticle) {
      setSelectedArticle(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  }, [selectedArticle, selectedCategory]);

  // Get category label
  const getCategoryLabel = (categoryId: HelpCategory) => {
    const category = HELP_CATEGORIES.find(c => c.id === categoryId);
    return category ? t(category.labelKey) : categoryId;
  };

  // Get articles count per category
  const getArticleCount = (categoryId: HelpCategory) => {
    return availableArticles.filter(a => a.category === categoryId).length;
  };

  if (!isOpen) return null;

  // Render article content
  const renderArticleContent = () => {
    if (!selectedArticle) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Article Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gray-50">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label={t('common:buttons.back')}
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {getCategoryLabel(selectedArticle.category)}
            </p>
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {t(selectedArticle.titleKey)}
            </h2>
          </div>
        </div>

        {/* Article Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-600 mb-6 text-base leading-relaxed">
              {t(selectedArticle.descriptionKey)}
            </p>
            <div 
              className="text-gray-700 leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t(selectedArticle.contentKey)) }}
            />
          </div>
        </div>

        {/* Article Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            {t('help:modal.needMoreHelp')}{' '}
            <a
              href="mailto:support@procrechesolutions.com"
              className="text-swiss-mint hover:underline font-medium"
            >
              {t('help:modal.contactSupport')}
            </a>
          </p>
        </div>
      </div>
    );
  };

  // Render category list (sidebar)
  const renderCategoryList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{t('help:modal.categories')}</h3>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {availableCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.id);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              selectedCategory === category.id
                ? 'bg-swiss-mint/10 text-swiss-teal font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl" role="img" aria-hidden="true">
              {category.icon}
            </span>
            <span className="flex-1 text-sm">{t(category.labelKey)}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {getArticleCount(category.id)}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );

  // Render article list
  const renderArticleList = () => (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('help:modal.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent text-sm"
          />
        </div>
        {selectedCategory && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-swiss-teal hover:underline"
            >
              {t('help:modal.allCategories')}
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-xs text-gray-600 font-medium">
              {getCategoryLabel(selectedCategory)}
            </span>
          </div>
        )}
      </div>

      {/* Articles */}
      <div className="flex-1 overflow-y-auto">
        {filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">{t('help:modal.noResults')}</p>
            <p className="text-sm text-gray-400">{t('help:modal.tryDifferentSearch')}</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="w-full p-4 rounded-lg text-left hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 mb-1"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {t(article.titleKey)}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {t(article.descriptionKey)}
                    </p>
                    {!selectedCategory && (
                      <span className="inline-block mt-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {getCategoryLabel(article.category)}
                      </span>
                    )}
                  </div>
                  <ChevronLeftIcon className="w-5 h-5 text-gray-400 rotate-180 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] max-h-[700px] flex flex-col overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-swiss-teal to-swiss-mint">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-6 h-6 text-white" />
            <h1 id="help-modal-title" className="text-lg sm:text-xl font-bold text-white">
              {t('help:modal.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={t('help:modal.toggleMenu')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={t('common:buttons.close')}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex flex-1 min-h-0 relative">
          {/* Sidebar - Desktop */}
          <div className="hidden md:flex md:w-64 border-r border-gray-200 bg-gray-50 flex-shrink-0">
            {renderCategoryList()}
          </div>

          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute inset-0 z-10 bg-white">
              {renderCategoryList()}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 flex flex-col bg-white">
            {selectedArticle ? renderArticleContent() : renderArticleList()}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {t('help:modal.supportEmail')}:{' '}
            <a href="mailto:support@procrechesolutions.com" className="text-swiss-teal hover:underline">
              support@procrechesolutions.com
            </a>
          </p>
          <a
            href="/support"
            onClick={onClose}
            className="text-xs text-swiss-teal hover:underline flex items-center gap-1"
          >
            {t('help:modal.goToSupport')}
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
