import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { createUnistorage } from 'pinia-plugin-unistorage'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)

  const pinia = createPinia()
  // 让 pinia store 自动持久化到本地存储
  pinia.use(createUnistorage())

  app.use(pinia)

  return { app, pinia }
}
