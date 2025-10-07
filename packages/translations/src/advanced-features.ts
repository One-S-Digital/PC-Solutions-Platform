/**
 * Advanced i18n Features
 * 
 * This module provides advanced internationalization features including
 * pluralization, date formatting, number formatting, and currency formatting.
 */

import { SupportedLanguage } from './types';

/**
 * Pluralization rules for different languages
 */
const PLURALIZATION_RULES = {
  en: (n: number) => n === 1 ? 'one' : 'other',
  fr: (n: number) => n <= 1 ? 'one' : 'other',
  de: (n: number) => n === 1 ? 'one' : 'other'
};

/**
 * Date formatting options
 */
export interface DateFormatOptions {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  weekday?: 'long' | 'short' | 'narrow';
  timeZone?: string;
}

/**
 * Number formatting options
 */
export interface NumberFormatOptions {
  style?: 'decimal' | 'currency' | 'percent';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

/**
 * Swiss date formatting
 */
export function formatDate(
  date: Date | string | number,
  language: SupportedLanguage,
  options: DateFormatOptions = {}
): string {
  const dateObj = new Date(date);
  
  const localeMap = {
    en: 'en-US',
    fr: 'fr-CH', // Swiss French
    de: 'de-CH'  // Swiss German
  };
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat(localeMap[language], defaultOptions).format(dateObj);
}

/**
 * Swiss number formatting
 */
export function formatNumber(
  number: number,
  language: SupportedLanguage,
  options: NumberFormatOptions = {}
): string {
  const localeMap = {
    en: 'en-US',
    fr: 'fr-CH', // Swiss French
    de: 'de-CH'  // Swiss German
  };
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'decimal',
    useGrouping: true,
    ...options
  };
  
  return new Intl.NumberFormat(localeMap[language], defaultOptions).format(number);
}

/**
 * Swiss currency formatting
 */
export function formatCurrency(
  amount: number,
  language: SupportedLanguage,
  currency: string = 'CHF'
): string {
  return formatNumber(amount, language, {
    style: 'currency',
    currency: currency
  });
}

/**
 * Swiss percentage formatting
 */
export function formatPercentage(
  value: number,
  language: SupportedLanguage,
  decimals: number = 0
): string {
  return formatNumber(value, language, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Pluralization helper
 */
export function getPluralForm(
  count: number,
  language: SupportedLanguage
): 'one' | 'other' {
  const rule = PLURALIZATION_RULES[language];
  return rule(count);
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | string | number,
  language: SupportedLanguage,
  unit: Intl.RelativeTimeFormatUnit = 'auto'
): string {
  const dateObj = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((dateObj.getTime() - now.getTime()) / 1000);
  
  const localeMap = {
    en: 'en-US',
    fr: 'fr-CH',
    de: 'de-CH'
  };
  
  const rtf = new Intl.RelativeTimeFormat(localeMap[language], { numeric: 'auto' });
  
  // Determine the appropriate unit and value
  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 }
  ];
  
  for (const { unit: timeUnit, seconds } of units) {
    const value = Math.floor(Math.abs(diffInSeconds) / seconds);
    if (value >= 1) {
      return rtf.format(diffInSeconds > 0 ? value : -value, timeUnit);
    }
  }
  
  return rtf.format(0, 'second');
}

/**
 * Format file size
 */
export function formatFileSize(
  bytes: number,
  language: SupportedLanguage
): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  const formattedSize = formatNumber(size, language, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1
  });
  
  return `${formattedSize} ${units[unitIndex]}`;
}

/**
 * Format phone number for Swiss context
 */
export function formatPhoneNumber(
  phone: string,
  language: SupportedLanguage
): string {
  // Swiss phone number formatting
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('41')) {
    // International format
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    // National format
    return `+41 ${cleaned.slice(1)}`;
  }
  
  return phone;
}

/**
 * Format address for Swiss context
 */
export function formatAddress(
  address: {
    street: string;
    number: string;
    postalCode: string;
    city: string;
    canton: string;
  },
  language: SupportedLanguage
): string {
  const { street, number, postalCode, city, canton } = address;
  
  if (language === 'de') {
    return `${street} ${number}, ${postalCode} ${city}, ${canton}`;
  } else if (language === 'fr') {
    return `${street} ${number}, ${postalCode} ${city}, ${canton}`;
  } else {
    return `${street} ${number}, ${postalCode} ${city}, ${canton}`;
  }
}

/**
 * Swiss-specific formatting utilities
 */
export const SwissFormatters = {
  /**
   * Format Swiss postal code
   */
  formatPostalCode: (code: string): string => {
    const cleaned = code.replace(/\D/g, '');
    if (cleaned.length === 4) {
      return cleaned;
    }
    return code;
  },
  
  /**
   * Format Swiss phone number
   */
  formatSwissPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('41') && cleaned.length === 11) {
      return `+41 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
  },
  
  /**
   * Format Swiss IBAN
   */
  formatIBAN: (iban: string): string => {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    if (cleaned.startsWith('CH') && cleaned.length === 21) {
      return cleaned.replace(/(.{4})/g, '$1 ').trim();
    }
    return iban;
  }
};

/**
 * Translation context helpers
 */
export const TranslationContext = {
  /**
   * Get gender-specific translation
   */
  getGenderSpecific: (
    translations: { male: string; female: string; neutral: string },
    gender: 'male' | 'female' | 'neutral' = 'neutral'
  ): string => {
    return translations[gender] || translations.neutral;
  },
  
  /**
   * Get formality-specific translation
   */
  getFormalitySpecific: (
    translations: { formal: string; informal: string },
    formal: boolean = true
  ): string => {
    return formal ? translations.formal : translations.informal;
  }
};