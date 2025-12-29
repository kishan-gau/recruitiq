/**
 * ESLint v9+ Flat Configuration
 * Enforces RecruitIQ coding standards across the monorepo
 * 
 * Standards Reference:
 * - docs/CODING_STANDARDS.md
 * - docs/BACKEND_STANDARDS.md
 * - docs/FRONTEND_STANDARDS.md
 * - docs/SECURITY_STANDARDS.md
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/pnpm-lock.yaml',
      'backend/migrations/**',
      'backend/seeds/**',
      'deployment-service/**',
      'user-manual/**',
    ],
  },

  // Base configuration for all JavaScript files
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      ...js.configs.recommended.rules,

      // Code Quality Rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-use-before-define': ['error', { 
        functions: false, 
        classes: true,
        variables: true,
      }],

      // Security Rules (RecruitIQ SECURITY_STANDARDS.md)
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-inline-comments': 'off', // Allow inline comments for clarity

      // Best Practices (RecruitIQ CODING_STANDARDS.md)
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'no-multi-spaces': 'error',
      'no-trailing-spaces': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'only-multiline'],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'max-len': ['warn', { 
        code: 120, 
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
      'max-lines-per-function': ['warn', { 
        max: 100, 
        skipBlankLines: true,
        skipComments: true,
      }],
      'complexity': ['warn', 15],
      'max-depth': ['warn', 4],
      'max-nested-callbacks': ['warn', 3],

      // ES6+ Rules
      'arrow-spacing': 'error',
      'arrow-parens': ['error', 'always'],
      'object-shorthand': ['error', 'always'],
      'prefer-destructuring': ['warn', { 
        array: false, 
        object: true,
      }],

      // Error Handling (RecruitIQ BACKEND_STANDARDS.md)
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',

      // Naming Conventions
      'camelcase': ['error', { 
        properties: 'never',
        ignoreDestructuring: true,
        allow: ['^UNSAFE_', '^_'],
      }],
    },
  },

  // Backend-specific rules
  {
    files: ['backend/**/*.js'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }], // Stricter for backend
      'max-lines-per-function': ['warn', { max: 100 }],
      
      // Custom rules for RecruitIQ patterns
      // Note: These would ideally be custom ESLint rules, documenting as warnings
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="pool"][callee.property.name="query"]',
          message: 'Use custom query() wrapper from config/database.js instead of pool.query() for tenant isolation and security logging.',
        },
        {
          selector: 'ExportDefaultDeclaration > NewExpression',
          message: 'Export class, not singleton instance. Use "export default ServiceName" not "export default new ServiceName()" for testability.',
        },
      ],
    },
  },

  // Test files configuration
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // Allow console in tests for debugging
      'max-lines-per-function': 'off', // Tests can be longer
      'max-nested-callbacks': ['warn', 5], // Tests have more nesting
    },
  },

  // Frontend-specific rules (React)
  {
    files: ['apps/**/*.jsx', 'apps/**/*.js', 'packages/**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React-specific rules would go here
      // These require @eslint/plugin-react which should be added
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
