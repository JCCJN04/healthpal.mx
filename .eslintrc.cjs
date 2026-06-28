module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'jsx-a11y'],
  rules: {
    // a11y rules — off until bulk fixes are applied
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/interactive-supports-focus': 'off',
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/no-autofocus': 'off',
    'jsx-a11y/alt-text': 'off',
    'jsx-a11y/media-has-caption': 'off',
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
