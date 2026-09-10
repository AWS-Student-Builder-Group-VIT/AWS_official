import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'tmp',
    // Quiz behavior is intentionally frozen for the current event release.
    'src/pages/AwsQuiz.jsx',
    'src/pages/CaseStudyQuiz.jsx',
    'src/pages/QuizHub.jsx',
    'src/utils/useScreenshotProtection.js',
  ]),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: [
      'src/components/OfficialGameReceipt.jsx',
      'src/pages/games/ASCII-Wordle/src/**/*.{js,jsx}',
      'src/pages/games/Morse-Game/src/**/*.{js,jsx}',
      'src/pages/games/level-devil/src/**/*.{js,jsx}',
    ],
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
    },
  },
  {
    files: ['server/**/*.js', 'vite.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
