module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
  },
  ignorePatterns: [
    'dist/',
    'coverage/',
    'node_modules/',
    '*.js',
    '**/*.d.ts',
    'src/**/*.ts', // Skip TypeScript files for now
  ],
};
