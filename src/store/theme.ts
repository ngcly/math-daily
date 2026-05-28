import { defineStore } from 'pinia'

export type ThemePref = 'system' | 'light' | 'dark'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    preference: (uni.getStorageSync('theme_pref') || 'system') as ThemePref,
    _systemIsDark: (uni.getSystemInfoSync().theme ?? 'light') === 'dark',
    currentTabIndex: 0,
  }),
  getters: {
    isDark(state): boolean {
      if (state.preference === 'dark') return true
      if (state.preference === 'light') return false
      return state._systemIsDark
    },
    // 'system' 模式返回空字符串，让 CSS @media (prefers-color-scheme: dark) 接管内容区域。
    // 注意：class 选择器（specificity 10）高于 @media 内继承值（specificity 1），
    // 若在 system 模式也返回 'theme-light'，会导致 @media 的暗色变量被覆盖，内容变浅色。
    themeClass(): string {
      if (this.preference === 'dark') return 'theme-dark'
      if (this.preference === 'light') return 'theme-light'
      return ''
    },
  },
  actions: {
    setPreference(pref: ThemePref) {
      this.preference = pref
      uni.setStorageSync('theme_pref', pref)
    },
    setSystemTheme(dark: boolean) {
      this._systemIsDark = dark
    },
    setCurrentTab(index: number) {
      this.currentTabIndex = index
    },
  },
})
