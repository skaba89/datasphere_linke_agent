// ESLint flat config native (Next.js 16 + TypeScript)
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // French UX copy commonly contains apostrophes in JSX text.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
      // Existing React Compiler findings: retain visibility while progressively refactoring.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
      'prefer-const': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    ignores: ['node_modules/', '.next/', 'build/', 'public/', '*.config.*', 'scripts/'],
  },
]

export default eslintConfig
