// Constants matching reference design
export const APP_NAME = 'Pro Crèche Solutions';

// Standard Tailwind classes for input fields - matching reference
const COMMON_INPUT_CLASSES_BASE =
  'block w-full bg-white placeholder-gray-400 shadow-sm border border-gray-300 rounded-button focus:outline-none focus:ring-1 focus:ring-swiss-mint focus:border-swiss-mint';
const COMMON_INPUT_CLASSES_PADDING_DEFAULT = 'px-3 py-2';
const COMMON_INPUT_CLASSES_PADDING_ICON = 'pl-10 pr-3 py-2'; // For inputs with a leading icon

export const STANDARD_INPUT_FIELD = `${COMMON_INPUT_CLASSES_BASE} ${COMMON_INPUT_CLASSES_PADDING_DEFAULT}`;
export const ICON_INPUT_FIELD = `${COMMON_INPUT_CLASSES_BASE} ${COMMON_INPUT_CLASSES_PADDING_ICON}`;

// Swiss Cantons
export const SWISS_CANTONS = [
  'Aargau',
  'Appenzell Ausserrhoden',
  'Appenzell Innerrhoden',
  'Basel-Landschaft',
  'Basel-Stadt',
  'Bern',
  'Fribourg',
  'Genève',
  'Glarus',
  'Graubünden',
  'Jura',
  'Luzern',
  'Neuchâtel',
  'Nidwalden',
  'Obwalden',
  'Sankt Gallen',
  'Schaffhausen',
  'Schwyz',
  'Solothurn',
  'Thurgau',
  'Ticino',
  'Uri',
  'Valais',
  'Vaud',
  'Zug',
  'Zürich',
] as const;

// Service Categories
export const SERVICE_CATEGORIES = [
  'Cleaning',
  'Legal',
  'Maintenance',
  'Security',
  'Transportation',
  'Other',
] as const;

// Service Delivery Types
export const SERVICE_DELIVERY_TYPES = [
  'On-site',
  'Remote',
  'Hybrid',
] as const;