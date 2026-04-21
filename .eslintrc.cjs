module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      files: ['src/app/providers/**', 'src/context/**'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
    {
      files: ['src/shared/components/ui/Toast.tsx', 'src/features/public/components/DirectorioFilters.tsx'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
}
