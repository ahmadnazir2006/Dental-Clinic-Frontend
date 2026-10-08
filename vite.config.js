import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
plugins: [
react(),
VitePWA({
registerType: 'prompt',
includeAssets: [],
manifest: {
name: 'Dental Clinic System',
short_name: 'Dental Clinic',
description: 'Dental clinic management and appointment system',
theme_color: '#0f766e',
background_color: '#ffffff',
display: 'standalone',
start_url: '/',
scope: '/',
icons: [
{
src: '/pwa-192x192.png',
sizes: '192x192',
type: 'image/png'
},
{
src: '/pwa-512x512.png',
sizes: '512x512',
type: 'image/png'
}
]
},
workbox: {
navigateFallback: 'index.html',
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
}
})
],
server: {
port: 5173,
proxy: {
'/api': {
target: 'http://127.0.0.1:8000',
changeOrigin: true,
rewrite: (p) => p.replace(/^\/api/, '')
}
}
}
})
