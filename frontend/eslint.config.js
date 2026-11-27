import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      'src/shared/components/ui/badge.tsx',
      'src/shared/components/ui/button.tsx',
      'src/shared/components/ui/button-group.tsx',
      'src/shared/components/ui/carousel.tsx',
      'src/shared/components/ui/message-scroller.tsx',
      'src/shared/components/ui/navigation-menu.tsx',
      'src/shared/components/ui/sidebar.tsx',
      'src/shared/components/ui/tabs.tsx',
      'src/shared/components/ui/toast.tsx',
      'src/shared/components/ui/toggle.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': ['error', {
        allowConstantExport: true,
        allowExportNames: [
          'badgeVariants',
          'buttonVariants',
          'buttonGroupVariants',
          'createToastManager',
          'navigationMenuTriggerStyle',
          'tabsListVariants',
          'toast',
          'toggleVariants',
          'useCarousel',
          'useMessageScroller',
          'useMessageScrollerScrollable',
          'useMessageScrollerVisibility',
          'useSidebar',
          'useToastManager',
        ],
      }],
    },
  },
])
