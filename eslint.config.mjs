import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  {
    ignores: [
      'assets/**',
      'pro/**',
      'node_modules/**',
      'vendor/**',
      'storybook-static/**',
      'frontend/language/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['frontend/**/*.{ts,vue}'],
    languageOptions: {
      // vue-eslint-parser reads the SFC, then hands <script> to the TS parser.
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        parser: tseslint.parser,
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        SERVER_VARIABLES: 'readonly',
        wp: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // The app's components are single-word by design (TopBar, PageHeader).
      'vue/multi-word-component-names': 'off',

      /*
       * Template formatting is prettier's job in this project, and these rules
       * disagree with it - leaving them on means every formatted file reports
       * warnings that "fixing" would immediately un-format.
       */
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/attributes-order': 'off'
    }
  },
  {
    files: ['vite.config.ts', 'frontend/language/**/*.js'],
    languageOptions: { globals: { ...globals.node } }
  }
)
