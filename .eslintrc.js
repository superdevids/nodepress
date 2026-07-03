/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'prettier',
  ],

  plugins: ['@typescript-eslint'],

  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    projectService: true,
    tsconfigRootDir: __dirname,
  },

  env: {
    node: true,
    es2022: true,
  },

  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },

  overrides: [
    {
      files: ['**/*.config.*', '**/*.rc.*'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
      },
    },
    {
      files: ['**/*.test.*', '**/*.spec.*', 'packages/testing/**'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
      },
    },
  ],

  ignorePatterns: [
    '**/dist/**',
    '**/.next/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/coverage/**',
    '*.config.js',
  ],
};
