// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// The engine and content schema must stay pure TypeScript so they can run in
// Jest and in the Node content tools (see docs/ARCHITECTURE.md §2).
const platformImports = {
  patterns: [
    { group: ['react', 'react/*', 'react-native', 'react-native-*'], message: 'Engine code must be platform-independent.' },
    { group: ['expo', 'expo-*', '@shopify/*', '@/ui/*', '@/features/*', '@/render/*', '@/persistence/*'], message: 'Engine code must be platform-independent.' },
  ],
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    files: ['src/engine/**/*.ts', 'src/content/schema/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', platformImports] },
  },
  {
    // Zod idiom: a schema const and its inferred type share one name.
    files: ['src/content/schema/**/*.ts'],
    rules: { '@typescript-eslint/no-redeclare': 'off' },
  },
]);
