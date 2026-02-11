import { describe, it, expect } from 'vitest';
import {
  inferServiceCategoryFromFlexibleCategories,
  formatServiceCategoryForService,
} from '../../utils/serviceFormatting';
import { ServiceCategory } from '../../types';

describe('serviceFormatting', () => {
  const t = ((key: string, fallback: string) => {
    const dict: Record<string, string> = {
      'common:serviceCategories.CLEANING': 'Cleaning & Maintenance',
      'common:serviceCategories.IT_SUPPORT': 'IT & Technical Support',
      'common:serviceCategories.MAINTENANCE': 'Facilities Maintenance',
      'common:serviceCategories.CONSULTING': 'Consulting',
      'common:serviceCategories.TRAINING': 'Training & Coaching',
      'common:serviceCategories.OTHER': 'Other',
    };
    return dict[key] ?? fallback;
  }) as any;

  it('returns undefined when no valid flexible category exists', () => {
    expect(inferServiceCategoryFromFlexibleCategories(undefined)).toBeUndefined();
    expect(inferServiceCategoryFromFlexibleCategories([null, '', '  '])).toBeUndefined();
  });

  it('infers enum service category from known flexible labels', () => {
    expect(inferServiceCategoryFromFlexibleCategories(['IT & Technical Support'])).toBe(
      ServiceCategory.IT_SUPPORT,
    );
    expect(inferServiceCategoryFromFlexibleCategories(['it & technical support'])).toBe(
      ServiceCategory.IT_SUPPORT,
    );
    expect(inferServiceCategoryFromFlexibleCategories(['Consulting'])).toBe(ServiceCategory.CONSULTING);
  });

  it('returns undefined for unknown flexible category labels', () => {
    expect(inferServiceCategoryFromFlexibleCategories(['Graphic Design'])).toBeUndefined();
  });

  it('prefers flexible categories for display when present', () => {
    const label = formatServiceCategoryForService(t, {
      category: ServiceCategory.CLEANING,
      categories: ['IT & Technical Support'],
    });
    expect(label).toBe('IT & Technical Support');
  });

  it('falls back to the raw flexible label when it cannot be mapped', () => {
    const label = formatServiceCategoryForService(t, {
      category: ServiceCategory.CLEANING,
      categories: ['  Graphic Design for Childcare  '],
    });
    expect(label).toBe('Graphic Design for Childcare');
  });

  it('falls back to legacy enum category when no flexible categories exist', () => {
    const label = formatServiceCategoryForService(t, {
      category: ServiceCategory.MAINTENANCE,
      categories: [],
    });
    expect(label).toBe('Facilities Maintenance');
  });

  it('handles null/undefined service inputs', () => {
    expect(formatServiceCategoryForService(t, null)).toBe('Other');
    expect(formatServiceCategoryForService(t, undefined)).toBe('Other');
  });
});

