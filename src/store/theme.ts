import { defineStore } from 'pinia'
import { getSystemIsDark } from '@/utils/theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    _systemIsDark: getSystemIsDark(),
    currentTabIndex: 0,
  }),
  getters: {
    isDark(state): boolean {
      return state._systemIsDark
    },
    themeClass(): string {
      return this.isDark ? 'theme-dark' : 'theme-light'
    },
  },
  actions: {
    setSystemTheme(dark: boolean) {
      this._systemIsDark = dark
    },
    setCurrentTab(index: number) {
      this.currentTabIndex = index
    },
  },
})
