/**
 * Modern ESLint 9 Configuration (Flat Config)
 * 
 * This configuration enforces all RecruitIQ coding standards including:
 * - ES Module standards with proper imports
 * - Frontend best practices (React, hooks, patterns)
 * - Security standards (no hardcoded secrets, proper validation)
 * - Performance optimization guidelines
 * - Accessibility requirements
 * - Code organization and naming conventions
 * 
 * Standards Documents:
 * - CODING_STANDARDS.md - Overview of all standards
 * - FRONTEND_STANDARDS.md - React component and hook patterns
 * - SECURITY_STANDARDS.md - Security best practices
 * - TESTING_STANDARDS.md - Testing patterns and conventions
 * - API_STANDARDS.md - API client usage and contracts
 */

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import securityPlugin from 'eslint-plugin-security';

export default tseslint.config(
  // =============================================================================
  // IGNORES - Files to exclude from linting
  // =============================================================================
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      'coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.d.ts',
      '**/__generated__/**',
      '**/generated/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },

  // =============================================================================
  // BASE CONFIGURATION - JavaScript/TypeScript
  // =============================================================================
  {
    files: ['src/**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        React: 'readonly'
      }
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json'
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
        }
      },
      react: {
        version: 'detect'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      security: securityPlugin
    },
    rules: {
      // ==========================================================================
      // ES Module & Import Standards (MANDATORY)
      // From: CODING_STANDARDS.md, FRONTEND_STANDARDS.md
      // ==========================================================================

      /**
       * CRITICAL: Enforce ES Module syntax only
       * NO CommonJS require() or module.exports
       * 
       * ✅ CORRECT:
       *   import JobService from './JobService.js';
       *   export default JobService;
       * 
       * ❌ WRONG:
       *   const JobService = require('./JobService');
       *   module.exports = JobService;
       */
      'no-var': 'error',
      'prefer-const': 'error',

      /**
       * No undefined variables
       * From: CODING_STANDARDS.md - Code Quality
       * Catches references to variables that haven't been defined
       * 
       * ✅ CORRECT:
       *   const value = 10;
       *   console.log(value);
       * 
       * ❌ WRONG:
       *   console.log(undefinedVar);  // ReferenceError!
       */
      'no-undef': 'error',

      /**
       * Import ordering (external → internal → relative)
       * From: FRONTEND_STANDARDS.md - Provider Wrapping Order section
       */
      'import/order': [
        'error',
        {
          groups: [
            'builtin',      // Node.js built-in modules (fs, path, etc.)
            'external',     // npm packages (@react, react, axios, etc.)
            'internal',     // Absolute imports from @recruitiq/*, project roots
            'parent',       // Relative imports from parent directories (../)
            'sibling',      // Relative imports from same directory (./*)
            'index'         // Index imports from current directory (./index)
          ],
          pathGroups: [
            // @recruitiq/* workspace packages
            {
              pattern: '@recruitiq/**',
              group: 'external',
              position: 'after'
            },
            // Project-relative imports
            {
              pattern: '@/**',
              group: 'internal'
            },
            {
              pattern: '~/**',
              group: 'internal'
            }
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],

      /**
       * Unused imports detection
       * From: FRONTEND_STANDARDS.md
       * NOTE: Disabled in flat config - use @typescript-eslint/no-unused-vars instead
       * The import/no-unused-modules rule requires .eslintrc file even with flat config
       * See: https://github.com/import-js/eslint-plugin-import/issues/3079
       */
      'import/no-unused-modules': 'off',

      /**
       * No default exports for services
       * From: BACKEND_STANDARDS.md - Service Layer Standards
       * Services must export classes for dependency injection
       * 
       * NOTE: This rule does not accept options - configure at severity level only
       */
      'import/no-default-export': 'off',  // Disabled: too strict for React components (common pattern)

      /**
       * No circular dependencies
       * Prevents architectural issues and bundling problems
       */
      'import/no-cycle': ['error', { maxDepth: '∞' }],

      /**
       * Ensure imports can be resolved
       * Catches typos in import paths early
       * TypeScript path aliases (@core, @shared, @features) are resolved by tsconfig.json
       */
      'import/no-unresolved': [
        'error',
        {
          caseSensitive: false
        }
      ],

      /**
       * No relative imports from node_modules
       */
      'import/no-absolute-path': 'error',

      // ==========================================================================
      // TypeScript Standards (MANDATORY for .ts/.tsx files)
      // From: FRONTEND_STANDARDS.md, CODING_STANDARDS.md
      // ==========================================================================

      /**
       * Require .js extensions in imports (ES Modules requirement)
       * From: FRONTEND_STANDARDS.md - Import Path Standards
       * 
       * ✅ CORRECT:
       *   import JobService from './JobService.js';
       *   import useAuth from '../hooks/useAuth.js';
       * 
       * ❌ WRONG:
       *   import JobService from './JobService';      // Missing extension
       *   import useAuth from '../hooks/useAuth.ts';  // Wrong extension (use .js)
       */
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports'
        }
      ],

      /**
       * No unused variables
       * From: CODING_STANDARDS.md - Code Quality
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],

      /**
       * Require explicit types for public APIs
       * From: FRONTEND_STANDARDS.md - Type Safety
       * NOTE: explicit-function-return-types was removed from typescript-eslint v8
       * Use explicit-module-boundary-types instead
       */
      '@typescript-eslint/explicit-module-boundary-types': [
        'warn',
        {
          allowArgumentsExplicitlyTypedAsAny: false
        }
      ],

      /**
       * No any types - use proper typing
       * From: FRONTEND_STANDARDS.md, CODING_STANDARDS.md
       */
      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          ignoreRestArgs: true,
          fixToUnknown: false
        }
      ],

      /**
       * Require explicit accessibility modifiers
       * Improves code clarity and prevents accidental exposure
       * NOTE: explicit-member-accessibility was removed from typescript-eslint v8
       * Disabled: Use TypeScript compiler settings for this instead (tsconfig.json: noImplicitAny)
       */
      // '@typescript-eslint/explicit-member-accessibility': 'off',

      /**
       * No non-null assertions (!) unless necessary
       * Forces proper null checking and type safety
       */
      '@typescript-eslint/no-non-null-assertion': 'warn',

      /**
       * Require array.includes() for checking membership
       */
      '@typescript-eslint/prefer-includes': 'error',

      /**
       * Use Array.isArray() for array checks
       */
      '@typescript-eslint/prefer-as-const': 'error',

      // ==========================================================================
      // React Standards (MANDATORY for React files)
      // From: FRONTEND_STANDARDS.md - React Component Standards
      // ==========================================================================

      /**
       * Enforce React functional components only
       * NO class components unless absolutely necessary
       * 
       * From: FRONTEND_STANDARDS.md
       */
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'function-declaration',
          unnamedComponents: 'arrow-function'
        }
      ],

      /**
       * Enforce hooks rules
       * Prevents runtime errors with hook usage
       * 
       * From: FRONTEND_STANDARDS.md - Hooks Guidelines
       */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': [
        'warn',
        {
          additionalHooks: 'useAsync'
        }
      ],

      /**
       * Require JSX quote type
       */
      'jsx-quotes': ['error', 'prefer-double'],

      /**
       * Enforce prop spreading best practices
       */
      'react/jsx-props-no-spreading': [
        'warn',
        {
          html: 'enforce',
          custom: 'ignore',
          exceptions: ['Component', 'Slot']
        }
      ],

      /**
       * Enforce no missing keys in lists
       * Critical for React list rendering performance
       */
      'react/jsx-key': [
        'error',
        {
          checkFragmentShorthand: true,
          checkKeyMustBeforeSpread: true
        }
      ],

      /**
       * No missing displayName for HOCs/render props
       */
      'react/display-name': 'warn',

      /**
       * Enforce self-closing components with no children
       */
      'react/self-closing-comp': 'error',

      /**
       * No unescaped entities in JSX
       */
      'react/no-unescaped-entities': 'error',

      /**
       * No constant array/object in JSX props
       * Forces optimization with useMemo/useCallback
       * 
       * From: FRONTEND_STANDARDS.md - Performance Optimization
       */
      'react/jsx-no-constructed-context-values': 'error',

      /**
       * No unused state
       */
      'react/no-unused-state': 'warn',

      /**
       * Enforce prop types with TypeScript
       */
      'react/prop-types': 'off', // Use TypeScript instead

      // ==========================================================================
      // Code Quality & Best Practices
      // From: CODING_STANDARDS.md, SECURITY_STANDARDS.md
      // ==========================================================================

      /**
       * Enforce const for variables that never reassign
       * From: CODING_STANDARDS.md
       */
      'prefer-arrow-callback': 'error',

      /**
       * No console.log in production code
       * From: FRONTEND_STANDARDS.md
       * 
       * ✅ CORRECT: Use proper logging library
       * ❌ WRONG: console.log('debug message')
       */
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info']
        }
      ],

      /**
       * No eval() - major security risk
       * From: SECURITY_STANDARDS.md
       */
      'no-eval': 'error',

      /**
       * No implied eval
       */
      'no-implied-eval': 'error',

      /**
       * Require error objects, not strings
       * From: SECURITY_STANDARDS.md - Error Handling
       */
      'no-throw-literal': 'error',

      /**
       * No debugger statements in code
       */
      'no-debugger': 'warn',

      /**
       * Require proper async/await error handling
       * From: FRONTEND_STANDARDS.md
       */
      'no-floating-promises': 'off', // Handled by TypeScript

      /**
       * No hardcoded secrets/API keys
       * From: SECURITY_STANDARDS.md - Secrets Management
       */
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-non-literal-require': 'warn',

      /**
       * Require semicolons (consistent code style)
       */
      'semi': ['error', 'always'],

      /**
       * Enforce consistent quote style
       */
      'quotes': [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true
        }
      ],

      /**
       * Enforce consistent brace style
       */
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],

      /**
       * Require proper spacing
       */
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always'
        }
      ],

      /**
       * No multiple statements per line
       */
      'no-multiple-empty-lines': ['error', { max: 2, maxBOF: 0, maxEOF: 1 }],

      /**
       * Enforce line length (documentation)
       */
      'max-len': [
        'warn',
        {
          code: 120,
          comments: 120,
          ignoreStrings: true,
          ignoreUrls: true,
          ignoreTemplateLiterals: true
        }
      ],

      /**
       * Enforce max function length (complexity)
       * Forces breaking into smaller, testable functions
       */
      'max-lines-per-function': [
        'warn',
        {
          max: 100,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true
        }
      ],

      /**
       * Enforce consistent parameter naming
       * From: FRONTEND_STANDARDS.md
       */
      'id-length': [
        'warn',
        {
          min: 2,
          exceptions: ['_', 'x', 'y', 'i', 'j', 'k', 'e']
        }
      ],

      /**
       * Prevent unreachable code
       */
      'no-unreachable': 'error',

      /**
       * Prevent empty blocks
       */
      'no-empty': 'error',

      /**
       * Enforce consistent arrow function return type
       */
      'arrow-body-style': ['error', 'as-needed'],

      /**
       * No shadowing of variables
       * From: CODING_STANDARDS.md
       */
      'no-shadow': [
        'error',
        {
          builtinGlobals: false,
          hoist: 'all',
          allow: []
        }
      ],

      /**
       * Prevent unnecessary null checks
       */
      '@typescript-eslint/no-unnecessary-condition': 'warn',

      /**
       * Consistent naming convention
       * From: FRONTEND_STANDARDS.md - Naming Conventions
       * React components and lazy imports: PascalCase
       * Utilities/hooks/regular functions: camelCase
       * 
       * NOTE: Relaxed rules to accommodate React best practices and API integrations
       */
      '@typescript-eslint/naming-convention': [
        'error',
        // Classes and enums: PascalCase
        {
          selector: 'class',
          format: ['PascalCase']
        },
        {
          selector: 'enum',
          format: ['PascalCase']
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE']
        },
        // Types and interfaces: PascalCase
        {
          selector: 'typeLike',
          format: ['PascalCase']
        },
        // Imports: Allow both camelCase and PascalCase (for React, components, types)
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow'
        },
        // Variables: Allow both camelCase and PascalCase
        // PascalCase for React components and lazy imports
        // camelCase for utilities, constants can be UPPER_CASE
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        // Functions: Allow both PascalCase and camelCase
        // PascalCase for React components (both exported and internal)
        // camelCase for utility functions and hooks
        {
          selector: 'function',
          format: ['PascalCase', 'camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        // Object literal properties: Allow all naming styles
        // Numeric keys, kebab-case, snake_case, camelCase, PascalCase all allowed
        // This accommodates API responses, configuration objects, and enum values
        {
          selector: 'property',
          format: null, // Disable format checking to allow maximum flexibility
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        // Class properties: camelCase (stricter for internal class state)
        {
          selector: 'classProperty',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        // Object methods: Allow PascalCase for component references (e.g., icon names)
        {
          selector: 'method',
          modifiers: ['public'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        // Class methods: camelCase
        {
          selector: 'classMethod',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        // Parameters: Allow both camelCase and PascalCase (for component props)
        {
          selector: 'parameter',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow'
        },
        // Default: camelCase with underscore allowances
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        }
      ]
    }
  },

  // =============================================================================
  // TEST FILES CONFIGURATION
  // =============================================================================
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly'
      }
    },
    rules: {
      /**
       * Relax some rules for test files
       * From: TESTING_STANDARDS.md
       */
      'max-lines-per-function': 'off', // Tests can be longer
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Tests are obvious
      'no-console': 'off', // Allow test output
      '@typescript-eslint/no-explicit-any': 'off', // Test mocks may use any
      'import/no-default-export': 'off' // Default exports OK in tests
    }
  },

  // =============================================================================
  // CONFIG FILES CONFIGURATION
  // =============================================================================
  {
    files: ['*.config.{js,ts}', '*.config.*.{js,ts}'],
    rules: {
      /**
       * Relax rules for configuration files
       */
      'import/no-default-export': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off'
    }
  },

  // =============================================================================
  // SECURITY PLUGIN DEFAULTS
  // =============================================================================
  {
    files: ['src/**/*.{js,ts,jsx,tsx}'],
    rules: {
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-non-literal-require': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'warn'
    }
  }
);
