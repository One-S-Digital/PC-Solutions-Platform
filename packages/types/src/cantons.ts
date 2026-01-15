/**
 * Swiss Canton Codes and Metadata
 * Used for policy document tracking and regional organization.
 *
 * NOTE: Keep this file dependency-free so it can be used across API/admin/frontend.
 */
export const CANTON_CODES = {
  AG: 'Aargau',
  AR: 'Appenzell Ausserrhoden',
  AI: 'Appenzell Innerrhoden',
  BL: 'Basel-Landschaft',
  BS: 'Basel-Stadt',
  BE: 'Bern',
  FR: 'Fribourg',
  GE: 'Geneva',
  GL: 'Glarus',
  GR: 'Grisons',
  JU: 'Jura',
  LU: 'Lucerne',
  NE: 'Neuchâtel',
  NW: 'Nidwalden',
  OW: 'Obwalden',
  SH: 'Schaffhausen',
  SZ: 'Schwyz',
  SO: 'Solothurn',
  SG: 'St. Gallen',
  TG: 'Thurgau',
  TI: 'Ticino',
  UR: 'Uri',
  VS: 'Valais',
  VD: 'Vaud',
  ZG: 'Zug',
  ZH: 'Zurich',
  CH: 'Federal (Switzerland)', // For federal documents
} as const;

export type CantonCode = keyof typeof CANTON_CODES;

export const CANTON_DEFAULT_LANGUAGES: Record<CantonCode, 'fr' | 'de' | 'it'> = {
  AG: 'de',
  AR: 'de',
  AI: 'de',
  BL: 'de',
  BS: 'de',
  BE: 'de',
  FR: 'fr',
  GE: 'fr',
  GL: 'de',
  GR: 'de',
  JU: 'fr',
  LU: 'de',
  NE: 'fr',
  NW: 'de',
  OW: 'de',
  SH: 'de',
  SZ: 'de',
  SO: 'de',
  SG: 'de',
  TG: 'de',
  TI: 'it',
  UR: 'de',
  VS: 'fr',
  VD: 'fr',
  ZG: 'de',
  ZH: 'de',
  CH: 'de',
};

/**
 * Get canton name by code.
 */
export function getCantonName(code: CantonCode): string {
  return CANTON_CODES[code];
}

/**
 * Get default language for a canton.
 */
export function getCantonDefaultLanguage(code: CantonCode): 'fr' | 'de' | 'it' {
  return CANTON_DEFAULT_LANGUAGES[code];
}

/**
 * Check if a code is a valid canton code.
 */
export function isValidCantonCode(code: string): code is CantonCode {
  return code in CANTON_CODES;
}

