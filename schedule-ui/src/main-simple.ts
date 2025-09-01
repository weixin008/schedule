import { createApp } from 'vue'

// 创建最简单的Vue应用
const app = createApp({
  template: `
    <div>
      <h1>Vue App is Working!</h1>
      <p>If you see this, Vue is rendering correctly.</p>
    </div>
  `
})

app.mount('#app')

console.log('Simple Vue app mounted successfully!')