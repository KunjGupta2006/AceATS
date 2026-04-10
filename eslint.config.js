import js from '@/js'
import globals from 'globals'
import reactHooks from '-plugin-react-hooks'
import reactRefresh from '-plugin-react-refresh'
import ts from 'typescript-'
import { defineConfig, globalIgnores } from '/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ts.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
