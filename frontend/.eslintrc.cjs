module.exports = {
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    'coverage/**',
    '*.cjs',
  ],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime', // Vite yeni JSX dönüşümü: `import React` gerekmez
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['e2e/**/*.spec.js'],
      env: {
        node: true,
      },
      globals: {
        test: 'readonly',
        expect: 'readonly',
      },
    },
    {
      // vitest.config.js: globals: true
      files: ['src/**/*.test.{js,jsx}'],
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  ],
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'no-unused-vars': 'warn',
    'prefer-const': 'error',
  },
};

