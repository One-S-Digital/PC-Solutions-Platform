module.exports = {
  locales: ['en'], // Only extract to English as per specification
  defaultNamespace: 'translation',
  output: 'public/locales/$LOCALE/$NAMESPACE.json',
  useKeysAsDefaultValue: false,
  defaultValue: (locale, ns, key, value) => value || '',
  keySeparator: '.',
  namespaceSeparator: ':',
  createOldCatalogs: false,
  sort: true,
  keepRemoved: true,
  // Only scan frontend source files, not dynamic content
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  // Don't extract from dynamic content or API responses
  exclude: [
    'src/services/**',
    'src/api/**',
    'src/constants.ts', // Avoid extracting from mock data
  ],
};
