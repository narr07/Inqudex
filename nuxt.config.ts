import process from 'node:process'

const host = process.env.TAURI_DEV_HOST

export default defineNuxtConfig({
	modules: ['@vueuse/nuxt', '@nuxt/ui'],
	ssr: false,
	devtools: { enabled: false },
	compatibilityDate: '2026-01-01',
	css: ['~/assets/css/main.css'],
	app: {
		head: {
			title: 'SEO Narr',
			charset: 'utf-8',
			viewport: 'width=device-width, initial-scale=1',
			meta: [{ name: 'description', content: 'Aplikasi desktop untuk mengelola SEO: Search Console, indexing, sitemap, audit situs, dan kecepatan halaman.' }]
		}
	},
	icon: {
		serverBundle: 'local',
		clientBundle: {
			scan: true,
			icons: ['ph:house-line', 'ph:chart-line-up']
		}
	},
	vite: {
		clearScreen: false,
		envPrefix: ['VITE_', 'TAURI_'],
		server: {
			strictPort: true,
			hmr: host ? { protocol: 'ws', host, port: 3001 } : undefined,
			watch: { ignored: ['**/src-tauri/**'] }
		}
	},
	devServer: { host: host || '0.0.0.0' }
})
