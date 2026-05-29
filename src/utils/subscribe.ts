export const DAILY_SUBSCRIBE_TEMPLATE_ID = 'KiJLSpuOmVhQ5RJh5LqkQbMrfWYqkUVIHj2C1Dy4k78'

export type SubscribeStatus = 'accept' | 'reject' | 'ban' | 'fail'

export function requestDailySubscribe(): Promise<SubscribeStatus> {
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [DAILY_SUBSCRIBE_TEMPLATE_ID],
      success: (res) => {
        const status = res[DAILY_SUBSCRIBE_TEMPLATE_ID]
        if (status === 'accept') {
          resolve('accept')
        } else if (status === 'ban') {
          resolve('ban')
        } else {
          resolve('reject')
        }
      },
      fail: (err) => {
        console.error('[subscribe] requestSubscribeMessage failed:', err)
        resolve('fail')
      },
    })
  })
}

export function showSubscribeStatusToast(status: SubscribeStatus, successTitle = '订阅成功') {
  if (status === 'accept') {
    uni.showToast({ title: successTitle, icon: 'none' })
    return
  }

  if (status === 'ban') {
    uni.showToast({ title: '订阅消息已关闭，请在微信设置中开启', icon: 'none' })
    return
  }

  if (status === 'fail') {
    uni.showToast({ title: '订阅请求失败，请稍后重试', icon: 'none' })
    return
  }

  uni.showToast({ title: '未开启提醒，可稍后再试', icon: 'none' })
}
