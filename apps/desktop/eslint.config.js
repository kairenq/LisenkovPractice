import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import pluginTs from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const nodeGlobals = {
  process: 'readonly',
  __dirname: 'readonly',
  module: 'readonly',
  require: 'readonly',
  console: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  URL: 'readonly',
  Blob: 'readonly',
  prompt: 'readonly',
  console: 'readonly',
};

export default [
  { ignores: ['dist', 'release'] },
  js.configs.recommended,
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'vite.renderer.config.ts'],
    languageOptions: { parser, globals: nodeGlobals },
    plugins: { '@typescript-eslint': pluginTs },
    rules: {
      ...pluginTs.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/renderer/src/**/*.{ts,tsx}'],
    languageOptions: { parser, globals: browserGlobals },
    plugins: {
      '@typescript-eslint': pluginTs,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...pluginTs.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
