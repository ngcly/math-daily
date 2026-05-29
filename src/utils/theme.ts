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
