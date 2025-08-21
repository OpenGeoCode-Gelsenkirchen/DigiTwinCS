import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        files: ['**/*.js'],
        rules: {
            'no-console': ['error', {allow: ['warn', 'error']}],
        },
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
        },
        rules: {
            'no-console': ['error', {allow: ['warn', 'error']}],
        },
    },
    {
        ignores: ['node_modules/', 'dist/'],
    },
);
