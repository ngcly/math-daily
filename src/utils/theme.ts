import type { ThemePref } from '@/store/theme'

const TAB_BAR_ITEMS = [
  {
    text: '今日题',
    iconPath: 'static/icons/home.png',
    selectedIconPath: 'static/icons/home-active.png',
    selectedIconPathDark: 'static/icons/home-active-dark.png',
  },
  {
    text: '历史',
    iconPath: 'static/icons/history.png',
    selectedIconPath: 'static/icons/history-active.png',
    selectedIconPathDark: 'static/icons/history-active-dark.png',
  },
  {
    text: '设置',
    iconPath: 'static/icons/settings.png',
    selectedIconPath: 'static/icons/settings-active.png',
    selectedIconPathDark: 'static/icons/settings-active-dark.png',
  },
]

export function getSystemIsDark(): boolean {
  try {
    const appBaseInfo = wx.getAppBaseInfo?.()
    if (appBaseInfo?.theme) return appBaseInfo.theme === 'dark'
  } catch {}

  try {
    return (wx.getSystemInfoSync() as any).theme === 'dark'
  } catch {
    return false
  }
}

export function resolveThemeIsDark(preference: ThemePref, systemIsDark = getSystemIsDark()): boolean {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return systemIsDark
}

export function syncNativeTabBarTheme(isDark: boolean) {
  const style = {
    color: isDark ? '#606060' : '#aaaaaa',
    selectedColor: isDark ? '#f0f0f0' : '#1a1a1a',
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderStyle: 'black' as const,
  }

  wx.setTabBarStyle?.({
    ...style,
    fail: () => {},
  })

  TAB_BAR_ITEMS.forEach((item, index) => {
    wx.setTabBarItem?.({
      index,
      text: item.text,
      iconPath: item.iconPath,
      selectedIconPath: isDark ? item.selectedIconPathDark : item.selectedIconPath,
      fail: () => {},
    })
  })
}
