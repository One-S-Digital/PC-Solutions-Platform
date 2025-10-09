module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'i18next',
  ],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        '**/_import_raw/**',
        '**/PC-solutions-Design/**',
        '**/*.min.js',
        '**/*.bundle.js'
      ]
    }],
    'no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    // i18n rules to prevent untranslated strings in JSX
    'i18next/no-literal-string': [
      'warn',
      {
        markupOnly: true,
        ignoreAttribute: [
          'className',
          'style',
          'type',
          'id',
          'name',
          'data-testid',
          'aria-label',
          'aria-labelledby',
          'aria-describedby',
          'role',
          'href',
          'src',
          'alt',
          'for',
          'key',
          'variant',
          'size',
          'color',
        ],
        ignore: [
          '^[0-9]+$',
          '^[A-Z_]+$',
          '^/$',
          '^#',
          '^/',
        ],
      },
    ],
  },
};
