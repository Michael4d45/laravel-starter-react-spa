import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNoManualMemo from 'eslint-plugin-react-no-manual-memo';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    ...typescript.configs.strictTypeChecked,

    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/restrict-plus-operands': 'off',
            '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/no-redundant-type-constituents': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },

    {
        plugins: {
            'react-hooks': reactHooks,
            'react-no-manual-memo': reactNoManualMemo,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/config': 'error',
            'react-hooks/error-boundaries': 'error',
            'react-hooks/component-hook-factories': 'error',
            'react-hooks/gating': 'error',
            'react-hooks/globals': 'error',
            'react-hooks/immutability': 'error',
            'react-hooks/preserve-manual-memoization': 'error',
            'react-hooks/purity': 'error',
            'react-hooks/refs': 'error',
            'react-hooks/set-state-in-effect': 'error',
            'react-hooks/set-state-in-render': 'error',
            'react-hooks/static-components': 'error',
            'react-hooks/unsupported-syntax': 'error',
            'react-hooks/use-memo': 'error',
            'react-hooks/incompatible-library': 'error',
            'react-no-manual-memo/no-hook-memo': 'error',
        },
    },

    {
        ignores: [
            'vendor',
            'node_modules',
            'public',
            'storage',
            'bootstrap/ssr',
            'tailwind.config.js',
            'resources/js/routes',
            'resources/js/wayfinder',
            'resources/js/actions',
            'eslint.config.js',
            'laravelDataTypes.ts',
            'vite.config.js',
            'reports',
            'resources/js/types/generated.d.ts',
            'resources/js/types/enums.ts',
            'resources/types/generated.d.ts',
        ],
    },

    prettier,
];
