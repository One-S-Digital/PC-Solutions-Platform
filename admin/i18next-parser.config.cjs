module.exports = {
  locales: ['en'],
  defaultNamespace: 'common',
  output: 'src/i18n/locales/$LOCALE/$NAMESPACE.json',
  useKeysAsDefaultValue: false,
  defaultValue: (locale, ns, key, value) => value || '',
  keySeparator: '.',
  namespaceSeparator: ':',
  createOldCatalogs: false,
  sort: true,
  keepRemoved: true,
  // Only scan source files, not node_modules
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  // Don't extract from dynamic content
  exclude: [
    'src/i18n/**',
    'src/services/translationApi.ts',
  ],
};

