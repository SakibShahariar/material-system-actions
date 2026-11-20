export default [
    {
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                global: 'readonly',
                log: 'readonly',
                logError: 'readonly',
                print: 'readonly',
                imports: 'readonly',
            },
        },
        rules: {
            'no-dupe-keys': 'error',
            'no-unreachable': 'error',
            'no-constant-condition': 'error',
            'no-unused-vars': ['error', {argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
        },
    },
];
