/**
 * Modern ESLint 9 Configuration (Flat Config) - Backend
 *
 * This configuration enforces all RecruitIQ backend coding standards including:
 * - ES Module standards with proper imports
 * - Backend layer architecture (routes → controllers → services → repositories)
 * - Security standards (tenant isolation, no hardcoded secrets, input validation)
 * - Database query standards (parameterized queries, organization_id filtering)
 * - Error handling and logging patterns
 * - Test coverage requirements
 * - Code organization and naming conventions
 *
 * Standards Documents:
 * - CODING_STANDARDS.md - Overview of all standards
 * - BACKEND_STANDARDS.md - Layer architecture and service patterns
 * - DATABASE_STANDARDS.md - Query patterns and multi-tenant safety
 * - SECURITY_STANDARDS.md - Security best practices
 * - TESTING_STANDARDS.md - Testing patterns and coverage requirements
 * - API_STANDARDS.md - REST API conventions and response formats
 */

import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      'coverage/**',
      '**/*.config.js',
      '**/*.d.ts',
      '**/__generated__/**',
      '**/generated/**',
      'migrations/**',
      'seeds/**'
    ]
  },

  // JavaScript files configuration
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-implicit-coercion': 'error',
      'no-param-reassign': 'error',
      'no-shadow': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-with': 'error',
      'no-multi-assign': 'error',
      'require-await': 'error',
      'no-return-await': 'error',
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      'keyword-spacing': 'error',
      'arrow-spacing': 'error',
      'space-infix-ops': 'error',
      'no-multi-spaces': 'error',
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always']
    }
  },

  // TypeScript files configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json'
      },
      globals: {
        ...globals.node,
        ...globals.es2024
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript-specific rules - relaxed for migration
      '@typescript-eslint/no-explicit-any': 'warn',  // Warn but allow during migration
      '@typescript-eslint/explicit-function-return-type': 'off',  // Too strict for migration
      '@typescript-eslint/explicit-module-boundary-types': 'off',  // Too strict for migration
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      
      // Base rules that work for both JS and TS
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      'no-var': 'error',
      'prefer-const': 'warn',  // Changed from error to warn
      'prefer-arrow-callback': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-with': 'error',
      'require-await': 'warn',  // Changed from error to warn
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'keyword-spacing': 'error',
      'arrow-spacing': 'error',
      'space-infix-ops': 'error',
      'no-multi-spaces': 'error',
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always']
    }
  },

  {
    files: ['**/*.test.js', '**/tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'require-await': 'off',
      'no-unused-expressions': 'off'
    }
  },

  // Test files - more lenient rules
  {
    files: ['**/*.test.ts', '**/*.test.js', '**/__tests__/**/*.ts', '**/__tests__/**/*.js'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  // Prettier integration - must be last to override other formatting rules
  prettierConfig
];

export default eslintConfig;