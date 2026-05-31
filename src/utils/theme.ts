export function getSystemIsDark(): boolean {
  try {
    const appBaseInfo = wx.getAppBaseInfo?.()
    if (appBaseInfo?.theme) return appBaseInfo.theme === 'dark'
  } catch {}

  try {
    const info: { theme?: string } = uni.getSystemInfoSync() as { theme?: string }
    return info.theme === 'dark'
  } catch {
    return false
  }
}
