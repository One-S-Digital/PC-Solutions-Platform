// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn'
    },
  },
  // Prevent direct LLM imports outside the AI gateway module.
  // All LLM calls must go through LlmClient in api/src/ai/.
  {
    files: ['src/**/*.ts'],
    ignores: ['src/ai/**'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            { group: ['openai', 'openai/*'], message: 'Import OpenAI only inside api/src/ai/ — use LlmClient elsewhere.' },
            { group: ['@google/generative-ai', '@google/generative-ai/*'], message: 'Direct Google AI imports are forbidden outside api/src/ai/.' },
            { group: ['@anthropic-ai/sdk', '@anthropic-ai/sdk/*'], message: 'Direct Anthropic imports are forbidden outside api/src/ai/.' },
          ],
        },
      ],
    },
  },
);