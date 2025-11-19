import { TFunction } from 'i18next';
import { ServiceCategory, ServiceDeliveryType } from '../types';

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

export const formatServiceDeliveryType = (
  t: TFunction,
  deliveryType?: ServiceDeliveryType | string | null,
) => {
  if (!deliveryType) {
    return t('common:notAvailable', 'N/A');
  }

  return t(`common:serviceDeliveryTypes.${deliveryType}`, deliveryType);
};
