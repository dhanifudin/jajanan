import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Resolve auth BEFORE the first navigation so the router guard
// can redirect admin-only pages immediately.
const auth = useAuthStore()
auth.init().then(() => app.mount('#app'))
