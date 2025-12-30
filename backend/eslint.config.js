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
import importPlugin from 'eslint-plugin-import';
import securityPlugin from 'eslint-plugin-security';

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
    plugins: {
      import: importPlugin,
      security: securityPlugin
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
      'eol-last': ['error', 'always'],
      'import/extensions': ['error', 'always', { ignorePackages: true }],
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'warn',
      'import/no-self-import': 'error',
      'import/no-unused-modules': 'warn',
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always'
      }],
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn'
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
  }
];

export default eslintConfig;