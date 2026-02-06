import { TFunction } from 'i18next';
import { Service, ServiceCategory, ServiceDeliveryType } from '../types';

export const humanize = (value: string) =>
  value
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());

// Format any category string to proper case (not uppercase)
export const formatCategory = (category: string | null | undefined): string => {
  if (!category) return '';
  return humanize(String(category));
};

export const formatServiceCategory = (
  t: TFunction,
  category?: ServiceCategory | string | null,
) => {
  if (!category) {
    return t('common:serviceCategories.OTHER', humanize('OTHER'));
  }

  const normalizedKey = String(category).toUpperCase();
  return t(`common:serviceCategories.${normalizedKey}`, humanize(String(category)));
};

const normalizeFlexibleCategoryLabel = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Many parts of the app still render the legacy enum `service.category` (ServiceCategory),
 * but the newer UI stores user-selected categories in `service.categories` (string[]).
 *
 * This helper maps known flexible labels back to the legacy enum so we can:
 * - display the translated label via `common:serviceCategories.*`
 * - avoid everything falling back to the modal's default enum (historically `CLEANING`)
 */
export const inferServiceCategoryFromFlexibleCategories = (
  categories?: Array<string | null | undefined>,
): ServiceCategory | undefined => {
  const first = (categories || []).find((c) => typeof c === 'string' && c.trim().length > 0);
  if (!first) return undefined;

  const key = normalizeFlexibleCategoryLabel(first);
  switch (key) {
    case 'cleaning & maintenance':
      return ServiceCategory.CLEANING;
    case 'it & technical support':
      return ServiceCategory.IT_SUPPORT;
    case 'facilities maintenance':
      return ServiceCategory.MAINTENANCE;
    case 'consulting':
      return ServiceCategory.CONSULTING;
    case 'training & coaching':
      return ServiceCategory.TRAINING;
    case 'other':
      return ServiceCategory.OTHER;
    default:
      return undefined;
  }
};

export const formatServiceCategoryForService = (
  t: TFunction,
  service?: Pick<Service, 'category' | 'categories'> | null,
) => {
  if (!service) return formatServiceCategory(t, null);

  const inferred = inferServiceCategoryFromFlexibleCategories(service.categories);
  if (inferred) {
    return formatServiceCategory(t, inferred);
  }

  const firstFlexible = (service.categories || []).find((c) => typeof c === 'string' && c.trim().length > 0);
  if (firstFlexible) {
    // Preserve the original label as-entered (it may include punctuation like "&").
    return String(firstFlexible).trim();
  }

  return formatServiceCategory(t, service.category);
};

export const formatServiceDeliveryType = (
  t: TFunction,
  deliveryType?: ServiceDeliveryType | string | null,
) => {
  if (!deliveryType) {
    return t('common:notAvailable', 'N/A');
  }

  return t(`common:serviceDeliveryTypes.${deliveryType}`, deliveryType);
};
