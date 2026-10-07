import { ref, computed } from 'vue'
import { appFetch, sleep } from './useHttp'

export type TrafficMode = 'direct' | 'organic' | 'referral' | 'campaign_utm'
export type SearchEngine = 'google' | 'bing' | 'yahoo' | 'duckduckgo' | 'yandex' | 'baidu' | 'ask' | 'aol'
export type OptimizationPreset = 'default' | 'max_sessions' | 'max_pageviews' | 'min_bounce' | 'max_bounce'

export interface ProxyItem {
	raw: string
	url: string
	auth?: { username: string; password: string }
	status: 'untested' | 'alive' | 'dead'
	speedCategory?: 'fast' | 'medium' | 'slow'
	latencyMs?: number
	lastChecked?: string
	failureCount?: number
}

export interface TrafficLog {
	id: string
	timestamp: string
	url: string
	mode: TrafficMode
	referrer: string
	userAgent: string
	proxy?: string
	status: number | 'ERR'
	durationMs: number
	internalPagesVisited?: number
	error?: string
}

export interface UtmConfig {
	enabled: boolean
	source: string
	medium: string
	campaign: string
	term: string
	content: string
}

export interface CampaignConfig {
	name: string
	urls: string[]
	mode: TrafficMode
	preset: OptimizationPreset
	keywords: string[]
	searchEngines: SearchEngine[]
	referrers: string[]
	utm: UtmConfig
	dwellTimeMin: number
	dwellTimeMax: number
	concurrency: number
	targetHits: number
	enableSurfing: boolean
	surfingPagesMin: number
	surfingPagesMax: number
	deviceRatio: 'mixed' | 'desktop_only' | 'mobile_only'
	useProxies: boolean
	proxySensitivityMs: number
	autoStopMinutes: number
}

const DESKTOP_UAS = [
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
]

const MOBILE_UAS = [
	'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
]

export const REFERRER_PRESETS = [
	{ label: 'Google Search', value: 'https://www.google.com/' },
	{ label: 'X / Twitter', value: 'https://t.co/' },
	{ label: 'Reddit', value: 'https://www.reddit.com/r/technology/' },
	{ label: 'Facebook', value: 'https://l.facebook.com/' },
	{ label: 'Instagram', value: 'https://l.instagram.com/' },
	{ label: 'LinkedIn', value: 'https://www.linkedin.com/feed/' },
	{ label: 'YouTube', value: 'https://www.youtube.com/' },
	{ label: 'Pinterest', value: 'https://www.pinterest.com/' },
	{ label: 'TikTok', value: 'https://www.tiktok.com/' },
	{ label: 'Medium', value: 'https://medium.com/' }
]

export const SEARCH_ENGINE_OPTIONS: { label: string; value: SearchEngine }[] = [
	{ label: 'Google', value: 'google' },
	{ label: 'Bing', value: 'bing' },
	{ label: 'Yahoo', value: 'yahoo' },
	{ label: 'DuckDuckGo', value: 'duckduckgo' },
	{ label: 'Yandex', value: 'yandex' },
	{ label: 'Baidu', value: 'baidu' },
	{ label: 'Ask.com', value: 'ask' },
	{ label: 'AOL', value: 'aol' }
]

// Global singleton state so campaign runs continuously across tabs
const isRunning = ref(false)
const isPaused = ref(false)
const activeWorkers = ref(0)
const logs = ref<TrafficLog[]>([])
const proxies = ref<ProxyItem[]>([])
const campaignStartTime = ref<number | null>(null)
const campaignEndTime = ref<number | null>(null)

const stats = ref({
	total: 0,
	success: 0,
	failed: 0,
	hitsPerMin: 0,
	avgLatencyMs: 0,
	surfingPagesVisited: 0
})

let abortController: AbortController | null = null
let hitTimestamps: number[] = []
let latencySum = 0
let autoStopTimer: any = null

export function useTraffic() {
	function parseProxyString(raw: string): ProxyItem | null {
		const trimmed = raw.trim()
		if (!trimmed || trimmed.startsWith('#')) return null

		try {
			let url = trimmed
			let auth: { username: string; password: string } | undefined

			if (trimmed.includes('://')) {
				const parsed = new URL(trimmed)
				if (parsed.username && parsed.password) {
					auth = { username: parsed.username, password: parsed.password }
				}
				url = `${parsed.protocol}//${parsed.host}`
			} else {
				const parts = trimmed.split(':')
				if (parts.length === 4) {
					// host:port:user:pass
					url = `http://${parts[0]}:${parts[1]}`
					auth = { username: parts[2]!, password: parts[3]! }
				} else if (parts.length === 2) {
					// host:port
					url = `http://${parts[0]}:${parts[1]}`
				} else {
					return null
				}
			}

			return {
				raw: trimmed,
				url,
				auth,
				status: 'untested'
			}
		} catch {
			return null
		}
	}

	function setProxyList(rawList: string) {
		const lines = rawList.split('\n')
		const parsed: ProxyItem[] = []
		for (const line of lines) {
			const item = parseProxyString(line)
			if (item) parsed.push(item)
		}
		proxies.value = parsed
	}

	async function importProxiesFromUrl(url: string) {
		const res = await appFetch(url)
		if (!res.ok) throw new Error(`HTTP ${res.status} gagal mengunduh daftar proxy`)
		const text = await res.text()
		setProxyList(text)
		return proxies.value.length
	}

	async function testProxy(item: ProxyItem, testUrl = 'https://httpbin.org/ip', maxTimeoutMs = 8000): Promise<boolean> {
		const start = Date.now()
		try {
			const proxyTarget = item.auth ? { url: item.url, basicAuth: item.auth } : item.url
			const options: any = {
				connectTimeout: maxTimeoutMs,
				proxy: { all: proxyTarget }
			}
			const res = await appFetch(testUrl, options)
			const lat = Date.now() - start
			item.latencyMs = lat
			item.status = res.ok ? 'alive' : 'dead'
			item.speedCategory = lat < 800 ? 'fast' : lat < 2000 ? 'medium' : 'slow'
			item.lastChecked = new Date().toLocaleTimeString('id-ID')
			return res.ok
		} catch (e: any) {
			item.latencyMs = Date.now() - start
			item.status = 'dead'
			item.speedCategory = 'slow'
			item.lastChecked = new Date().toLocaleTimeString('id-ID')
			console.warn(`[ProxyTest] ${item.url} gagal:`, e?.message || e)
			return false
		}
	}

	async function testAllProxies(testUrl = 'https://httpbin.org/ip', sensitivityMs = 8000, concurrency = 6) {
		const pool = proxies.value
		if (pool.length === 0) return
		let idx = 0
		const runWorker = async () => {
			while (idx < pool.length) {
				const current = pool[idx++]
				if (current) {
					await testProxy(current, testUrl, sensitivityMs)
				}
			}
		}
		const count = Math.min(concurrency, pool.length)
		const workers = Array.from({ length: count }, () => runWorker())
		await Promise.all(workers)
	}

	function getRandomUserAgent(deviceRatio: CampaignConfig['deviceRatio']): string {
		if (deviceRatio === 'desktop_only') {
			return DESKTOP_UAS[Math.floor(Math.random() * DESKTOP_UAS.length)]!
		}
		if (deviceRatio === 'mobile_only') {
			return MOBILE_UAS[Math.floor(Math.random() * MOBILE_UAS.length)]!
		}
		// 70% desktop, 30% mobile
		return Math.random() < 0.7
			? DESKTOP_UAS[Math.floor(Math.random() * DESKTOP_UAS.length)]!
			: MOBILE_UAS[Math.floor(Math.random() * MOBILE_UAS.length)]!
	}

	function buildReferrer(config: CampaignConfig): string {
		if (config.mode === 'direct') return ''

		if (config.mode === 'organic') {
			const engines = config.searchEngines.length > 0 ? config.searchEngines : ['google']
			const engine = engines[Math.floor(Math.random() * engines.length)]!
			const keywords = config.keywords.length > 0 ? config.keywords : ['seo tools']
			const kw = encodeURIComponent(keywords[Math.floor(Math.random() * keywords.length)]!)

			switch (engine) {
				case 'bing':
					return `https://www.bing.com/search?q=${kw}`
				case 'yahoo':
					return `https://search.yahoo.com/search?p=${kw}`
				case 'duckduckgo':
					return `https://duckduckgo.com/?q=${kw}`
				case 'yandex':
					return `https://yandex.com/search/?text=${kw}`
				case 'baidu':
					return `https://www.baidu.com/s?wd=${kw}`
				case 'ask':
					return `https://www.ask.com/web?q=${kw}`
				case 'aol':
					return `https://search.aol.com/aol/search?q=${kw}`
				case 'google':
				default:
					return `https://www.google.com/search?q=${kw}&oq=${kw}&sourceid=chrome&ie=UTF-8`
			}
		}

		if (config.mode === 'referral') {
			if (config.referrers.length === 0) return 'https://www.google.com/'
			return config.referrers[Math.floor(Math.random() * config.referrers.length)]!
		}

		if (config.mode === 'campaign_utm') {
			return config.referrers.length > 0 ? config.referrers[0]! : 'https://www.google.com/'
		}

		return ''
	}

	function attachUtm(urlStr: string, utm: UtmConfig): string {
		if (!utm.enabled) return urlStr
		try {
			const u = new URL(urlStr)
			if (utm.source) u.searchParams.set('utm_source', utm.source)
			if (utm.medium) u.searchParams.set('utm_medium', utm.medium)
			if (utm.campaign) u.searchParams.set('utm_campaign', utm.campaign)
			if (utm.term) u.searchParams.set('utm_term', utm.term)
			if (utm.content) u.searchParams.set('utm_content', utm.content)
			return u.toString()
		} catch {
			return urlStr
		}
	}

	let proxyIndex = 0
	function getNextProxy(useProxies: boolean, sensitivityMs: number): ProxyItem | undefined {
		if (!useProxies || proxies.value.length === 0) return undefined
		// Filter out dead proxies and those exceeding sensitivity threshold
		const liveProxies = proxies.value.filter(p => {
			if (p.status === 'dead') return false
			if (p.latencyMs && p.latencyMs > sensitivityMs) return false
			return true
		})
		const pool = liveProxies.length > 0 ? liveProxies : proxies.value
		const chosen = pool[proxyIndex % pool.length]
		proxyIndex++
		return chosen
	}

	/** Extracts internal links matching the same origin from raw HTML */
	function extractInternalLinks(html: string, baseUrl: string): string[] {
		try {
			const origin = new URL(baseUrl).origin
			const matches = html.matchAll(/href=["']([^"']+)["']/gi)
			const links = new Set<string>()

			for (const m of matches) {
				const raw = m[1]?.trim()
				if (!raw || raw.startsWith('#') || raw.startsWith('javascript:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue

				try {
					const resolved = new URL(raw, baseUrl)
					if (resolved.origin === origin && resolved.href !== baseUrl) {
						links.add(resolved.href)
					}
				} catch {}
			}
			return Array.from(links)
		} catch {
			return []
		}
	}

	async function performHit(config: CampaignConfig): Promise<void> {
		if (config.urls.length === 0) return
		const baseTargetUrl = config.urls[Math.floor(Math.random() * config.urls.length)]!
		const targetUrl = config.utm.enabled ? attachUtm(baseTargetUrl, config.utm) : baseTargetUrl
		const referrer = buildReferrer(config)
		const ua = getRandomUserAgent(config.deviceRatio)
		const proxy = getNextProxy(config.useProxies, config.proxySensitivityMs)

		const headers: Record<string, string> = {
			'User-Agent': ua,
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
			'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
			'Cache-Control': 'no-cache',
			'Pragma': 'no-cache',
			'Upgrade-Insecure-Requests': '1'
		}

		if (referrer) {
			headers['Referer'] = referrer
		}

		const fetchOptions: any = {
			method: 'GET',
			headers,
			connectTimeout: Math.max(5000, config.proxySensitivityMs)
		}

		if (proxy) {
			const proxyTarget = proxy.auth ? { url: proxy.url, basicAuth: proxy.auth } : proxy.url
			fetchOptions.proxy = { all: proxyTarget }
		}

		const start = Date.now()
		let status: number | 'ERR' = 'ERR'
		let errorMsg: string | undefined
		let responseBody = ''
		let internalPagesVisited = 0

		try {
			const res = await appFetch(targetUrl, fetchOptions)
			status = res.status
			try {
				responseBody = await res.text()
			} catch {}
		} catch (e: any) {
			errorMsg = e?.message || 'Koneksi gagal / batas waktu terlampaui'
		}

		const duration = Date.now() - start

		// Update metrics
		stats.value.total++
		if (typeof status === 'number' && status >= 200 && status < 400) {
			stats.value.success++
			if (proxy) {
				proxy.status = 'alive'
				proxy.latencyMs = duration
				proxy.failureCount = 0
			}

			// Surfing Mode: Visit internal pages under the same session if enabled
			if (config.enableSurfing && responseBody) {
				const internalLinks = extractInternalLinks(responseBody, targetUrl)
				if (internalLinks.length > 0) {
					const count = Math.min(
						internalLinks.length,
						Math.floor(config.surfingPagesMin + Math.random() * (config.surfingPagesMax - config.surfingPagesMin + 1))
					)

					for (let i = 0; i < count; i++) {
						if (!isRunning.value || isPaused.value) break
						const nextLink = internalLinks[Math.floor(Math.random() * internalLinks.length)]!

						// Internal dwell time between pages
						const subDwell = Math.round(2000 + Math.random() * 4000)
						await sleep(subDwell)

						try {
							const subHeaders = { ...headers, Referer: targetUrl }
							await appFetch(nextLink, { ...fetchOptions, headers: subHeaders })
							internalPagesVisited++
							stats.value.surfingPagesVisited++
						} catch {}
					}
				}
			}
		} else {
			stats.value.failed++
			if (proxy) {
				proxy.failureCount = (proxy.failureCount || 0) + 1
				if (proxy.failureCount >= 2) {
					proxy.status = 'dead'
				}
			}
		}

		latencySum += duration
		stats.value.avgLatencyMs = Math.round(latencySum / stats.value.total)

		// Calculate hits per minute over sliding 60-second window
		const now = Date.now()
		hitTimestamps.push(now)
		hitTimestamps = hitTimestamps.filter(t => now - t <= 60000)
		stats.value.hitsPerMin = hitTimestamps.length

		// Prepend log (keep last 500)
		const logItem: TrafficLog = {
			id: Math.random().toString(36).slice(2, 9),
			timestamp: new Date().toLocaleTimeString('id-ID'),
			url: targetUrl,
			mode: config.mode,
			referrer,
			userAgent: ua,
			proxy: proxy?.url,
			status,
			durationMs: duration,
			internalPagesVisited,
			error: errorMsg
		}

		logs.value.unshift(logItem)
		if (logs.value.length > 500) {
			logs.value.pop()
		}
	}

	async function runWorker(config: CampaignConfig) {
		activeWorkers.value++
		try {
			while (isRunning.value) {
				if (isPaused.value) {
					await sleep(500)
					continue
				}

				if (config.targetHits > 0 && stats.value.total >= config.targetHits) {
					isRunning.value = false
					break
				}

				await performHit(config)

				// Dwell time / delay pacing between requests
				const min = Math.max(1, config.dwellTimeMin)
				const max = Math.max(min, config.dwellTimeMax)
				const delaySec = min + Math.random() * (max - min)
				await sleep(Math.round(delaySec * 1000))
			}
		} finally {
			activeWorkers.value = Math.max(0, activeWorkers.value - 1)
		}
	}

	async function startCampaign(config: CampaignConfig) {
		if (isRunning.value) return
		if (config.urls.length === 0) {
			throw new Error('Masukkan setidaknya satu URL target')
		}

		isRunning.value = true
		isPaused.value = false
		campaignStartTime.value = Date.now()
		campaignEndTime.value = null
		abortController = new AbortController()

		// Auto-stop timer if configured
		if (config.autoStopMinutes > 0) {
			if (autoStopTimer) clearTimeout(autoStopTimer)
			autoStopTimer = setTimeout(() => {
				stopCampaign()
			}, config.autoStopMinutes * 60 * 1000)
		}

		const concurrency = Math.max(1, Math.min(20, config.concurrency))
		for (let i = 0; i < concurrency; i++) {
			runWorker(config)
		}
	}

	function pauseCampaign() {
		isPaused.value = true
	}

	function resumeCampaign() {
		isPaused.value = false
	}

	function stopCampaign() {
		isRunning.value = false
		isPaused.value = false
		campaignEndTime.value = Date.now()
		if (autoStopTimer) {
			clearTimeout(autoStopTimer)
			autoStopTimer = null
		}
		if (abortController) {
			abortController.abort()
			abortController = null
		}
	}

	function resetStats() {
		stats.value = {
			total: 0,
			success: 0,
			failed: 0,
			hitsPerMin: 0,
			avgLatencyMs: 0,
			surfingPagesVisited: 0
		}
		hitTimestamps = []
		latencySum = 0
		logs.value = []
		campaignStartTime.value = null
		campaignEndTime.value = null
	}

	// Preset configuration applicator
	function applyPreset(preset: OptimizationPreset, config: CampaignConfig) {
		config.preset = preset
		switch (preset) {
			case 'max_sessions':
				config.dwellTimeMin = 25
				config.dwellTimeMax = 60
				config.enableSurfing = true
				config.surfingPagesMin = 2
				config.surfingPagesMax = 4
				break
			case 'max_pageviews':
				config.dwellTimeMin = 4
				config.dwellTimeMax = 10
				config.enableSurfing = true
				config.surfingPagesMin = 3
				config.surfingPagesMax = 6
				break
			case 'min_bounce':
				config.dwellTimeMin = 15
				config.dwellTimeMax = 35
				config.enableSurfing = true
				config.surfingPagesMin = 2
				config.surfingPagesMax = 3
				break
			case 'max_bounce':
				config.dwellTimeMin = 3
				config.dwellTimeMax = 8
				config.enableSurfing = false
				break
			case 'default':
			default:
				config.dwellTimeMin = 5
				config.dwellTimeMax = 15
				config.enableSurfing = false
				break
		}
	}

	return {
		isRunning,
		isPaused,
		activeWorkers,
		stats,
		logs,
		proxies,
		campaignStartTime,
		campaignEndTime,
		setProxyList,
		importProxiesFromUrl,
		testProxy,
		testAllProxies,
		applyPreset,
		startCampaign,
		pauseCampaign,
		resumeCampaign,
		stopCampaign,
		resetStats
	}
}
