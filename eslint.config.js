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
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'no-self-assign': 'off',
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
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            'no-self-assign': 'off',
        },
    },
    {
        ignores: ['node_modules/', 'dist/'],
    },
);
