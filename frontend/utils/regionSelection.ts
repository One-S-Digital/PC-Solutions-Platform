import { ALL_REGIONS_OPTION } from '../constants';

/**
 * Toggle helper for multi-select fields that support a special "All" sentinel.
 *
 * Rules:
 * - Selecting "All" makes it the only selected value.
 * - Selecting any specific region/canton removes "All" (if present) and toggles that value.
 */
export function toggleMultiSelectWithAll(
  currentValues: readonly string[] | undefined,
  selectedValue: string,
): string[] {
  const values = (Array.isArray(currentValues) ? currentValues : [])
    .map(v => String(v))
    .filter(Boolean);

  const isAllSelectedValue = selectedValue === ALL_REGIONS_OPTION;
  const hasAll = values.includes(ALL_REGIONS_OPTION);

  if (isAllSelectedValue) {
    return hasAll ? values.filter(v => v !== ALL_REGIONS_OPTION) : [ALL_REGIONS_OPTION];
  }

  const withoutAll = values.filter(v => v !== ALL_REGIONS_OPTION);
  const hasSelected = withoutAll.includes(selectedValue);

  if (hasSelected) {
    return withoutAll.filter(v => v !== selectedValue);
  }

  return [...withoutAll, selectedValue];
}

/**
 * Normalize persisted arrays so that if "All" is present, it becomes the sole value.
 */
export function normalizeMultiSelectWithAll(values: readonly string[] | undefined): string[] {
  const list = (Array.isArray(values) ? values : [])
    .map(v => String(v))
    .filter(Boolean);

  if (list.includes(ALL_REGIONS_OPTION)) {
    return [ALL_REGIONS_OPTION];
  }

  // De-dupe while preserving order
  return Array.from(new Set(list));
}

