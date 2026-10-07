<script setup lang="ts">
import {
	REFERRER_PRESETS,
	SEARCH_ENGINE_OPTIONS,
	type CampaignConfig,
	type OptimizationPreset,
	type SearchEngine,
	type TrafficMode
} from '~/composables/useTraffic'

useHead({ title: 'Generator Trafik | Inqudex' })

const { site, gsc } = useGsc()
const toast = useToast()
const { exportCsv, pickFile } = useExport()
const traffic = useTraffic()

const activeTab = ref<'campaign' | 'presets' | 'proxies' | 'monitor'>('campaign')
function setTab(tab: 'campaign' | 'presets' | 'proxies' | 'monitor') {
	activeTab.value = tab
}
const tabItems = [
	{ label: 'Konfigurasi Kampanye', value: 'campaign', icon: 'ph:sliders' },
	{ label: 'Preset Strategi', value: 'presets', icon: 'ph:lightning' },
	{ label: 'Pengelola Proxy', value: 'proxies', icon: 'ph:shield-check' },
	{ label: 'Monitor Langsung', value: 'monitor', icon: 'ph:activity' }
]

// Campaign Config State
const campaignName = ref('Kampanye Standar')
const rawUrls = ref('')
const selectedPreset = ref<OptimizationPreset>('default')
const trafficMode = ref<TrafficMode>('organic')

const trafficModeOptions = [
	{ label: 'Organik (Mesin Pencari)', value: 'organic', description: 'Simulasikan pengunjung dari Google, Bing, Yahoo dengan query kata kunci' },
	{ label: 'Referral (Media Sosial & Tautan Luar)', value: 'referral', description: 'Simulasikan pengunjung dari Twitter, Reddit, Facebook, atau website luar' },
	{ label: 'Direct (Kunjungan Langsung)', value: 'direct', description: 'Pengunjung membuka URL langsung tanpa referer' },
	{ label: 'Kampanye UTM (Google Analytics)', value: 'campaign_utm', description: 'Kunjungan dengan parameter utm_source, utm_medium, utm_campaign' }
]

// Optimization Presets descriptions
const presetOptions: { label: string; value: OptimizationPreset; description: string }[] = [
	{ label: 'Standar Seimbang', value: 'default', description: 'Konfigurasi default seimbang untuk situs baru atau pemeliharaan trafik reguler' },
	{ label: 'Maksimal Durasi Sesi', value: 'max_sessions', description: 'Dwell time panjang (25-60 detik) dengan penjelajahan halaman internal untuk menaikkan skor keterlibatan' },
	{ label: 'Maksimal Pageview', value: 'max_pageviews', description: 'Fokus melipatgandakan pageview per sesi dengan mengunjungi 3 hingga 6 halaman internal' },
	{ label: 'Turunkan Bounce Rate', value: 'min_bounce', description: 'Menjamin pengunjung membuka minimal 2-3 halaman lain di situs yang sama' },
	{ label: 'Tingkatkan Bounce Rate', value: 'max_bounce', description: 'Kunjungan 1 halaman singkat untuk menyimulasikan lonjakan pengunjung satu arah' }
]

const rawKeywords = ref('jasa seo\ncara optimasi website\nbeli tools seo\naudit seo gratis\npanduan google index')
const selectedEngines = ref<SearchEngine[]>(['google', 'bing', 'yahoo'])
const selectedReferrers = ref<string[]>([REFERRER_PRESETS[0]!.value, REFERRER_PRESETS[1]!.value, REFERRER_PRESETS[2]!.value])
const customReferrer = ref('')

// UTM Tracking
const utmConfig = reactive({
	enabled: false,
	source: 'google',
	medium: 'cpc',
	campaign: 'promo_traffic',
	term: 'seo_tools',
	content: 'banner_header'
})

// Surfing Mode
const enableSurfing = ref(false)
const surfingPagesMin = ref(1)
const surfingPagesMax = ref(3)

// Timing & Behavior
const dwellTimeMin = ref(5)
const dwellTimeMax = ref(15)
const concurrency = ref(3)
const targetHits = ref(0)
const autoStopMinutes = ref(0)
const proxySensitivityMs = ref(5000)

const deviceRatio = ref<'mixed' | 'desktop_only' | 'mobile_only'>('mixed')
const deviceRatioOptions = [
	{ label: 'Campuran (70% Desktop, 30% HP)', value: 'mixed' },
	{ label: 'Hanya Desktop (Windows / Mac / Linux)', value: 'desktop_only' },
	{ label: 'Hanya HP / Mobile (Android / iOS)', value: 'mobile_only' }
]

const useProxies = ref(false)

// Proxy Manager State
const rawProxyInput = ref('')
const proxyFeedUrl = ref('')
const loadingProxyFeed = ref(false)
const testingProxies = ref(false)
const testTargetUrl = ref('https://httpbin.org/ip')

// Saved Profiles
interface SavedProfile {
	id: string
	name: string
	savedAt: string
	config: any
}
const savedProfiles = ref<SavedProfile[]>([])

function loadSavedProfiles() {
	try {
		const str = localStorage.getItem('seonarr_traffic_profiles')
		if (str) savedProfiles.value = JSON.parse(str)
	} catch {}
}

function saveCurrentProfile() {
	const cfg = getCleanConfig()
	const newProf: SavedProfile = {
		id: Date.now().toString(36),
		name: campaignName.value.trim() || 'Kampanye Baru',
		savedAt: new Date().toLocaleString('id-ID'),
		config: cfg
	}
	savedProfiles.value.push(newProf)
	localStorage.setItem('seonarr_traffic_profiles', JSON.stringify(savedProfiles.value))
	toast.add({ title: `Profil "${newProf.name}" berhasil disimpan`, color: 'success' })
}

function applySavedProfile(p: SavedProfile) {
	const c = p.config
	campaignName.value = p.name
	rawUrls.value = (c.urls || []).join('\n')
	trafficMode.value = c.mode || 'organic'
	selectedPreset.value = c.preset || 'default'
	rawKeywords.value = (c.keywords || []).join('\n')
	selectedEngines.value = c.searchEngines || ['google']
	selectedReferrers.value = c.referrers || []
	dwellTimeMin.value = c.dwellTimeMin || 5
	dwellTimeMax.value = c.dwellTimeMax || 15
	concurrency.value = c.concurrency || 2
	targetHits.value = c.targetHits || 0
	enableSurfing.value = c.enableSurfing || false
	surfingPagesMin.value = c.surfingPagesMin || 1
	surfingPagesMax.value = c.surfingPagesMax || 3
	deviceRatio.value = c.deviceRatio || 'mixed'
	useProxies.value = c.useProxies || false
	if (c.utm) Object.assign(utmConfig, c.utm)
	toast.add({ title: `Profil "${p.name}" dimuat`, color: 'success' })
}

function deleteSavedProfile(id: string) {
	savedProfiles.value = savedProfiles.value.filter(p => p.id !== id)
	localStorage.setItem('seonarr_traffic_profiles', JSON.stringify(savedProfiles.value))
	toast.add({ title: 'Profil dihapus', color: 'info' })
}

// Preset Handler
function handleApplyPreset(p: OptimizationPreset) {
	selectedPreset.value = p
	const dummyConfig: any = {
		dwellTimeMin: dwellTimeMin.value,
		dwellTimeMax: dwellTimeMax.value,
		enableSurfing: enableSurfing.value,
		surfingPagesMin: surfingPagesMin.value,
		surfingPagesMax: surfingPagesMax.value
	}
	traffic.applyPreset(p, dummyConfig)
	dwellTimeMin.value = dummyConfig.dwellTimeMin
	dwellTimeMax.value = dummyConfig.dwellTimeMax
	enableSurfing.value = dummyConfig.enableSurfing
	surfingPagesMin.value = dummyConfig.surfingPagesMin
	surfingPagesMax.value = dummyConfig.surfingPagesMax
	toast.add({ title: `Strategi ${p} diterapkan ke pengaturan`, color: 'success' })
}

// Import Helpers
function fillFromActiveSite() {
	if (!site.value) {
		toast.add({ title: 'Belum ada situs aktif terpilih', color: 'warning' })
		return
	}
	rawUrls.value = site.value
	toast.add({ title: 'URL situs aktif disalin ke target', color: 'success' })
}

async function importFromSitemap() {
	if (!site.value) {
		toast.add({ title: 'Pilih situs aktif terlebih dahulu', color: 'warning' })
		return
	}
	try {
		const res = await gsc(['sitemaps', 'list', '--site', site.value, '--json'])
		let foundUrls: string[] = []
		if (Array.isArray(res)) {
			foundUrls = res.map((r: any) => r.path || r.url).filter(Boolean)
		}
		if (foundUrls.length > 0) {
			rawUrls.value = foundUrls.join('\n')
			toast.add({ title: `${foundUrls.length} tautan berhasil diimpor dari sitemap`, color: 'success' })
		} else {
			toast.add({ title: 'Tidak ada daftar sitemap ditemukan', color: 'warning' })
		}
	} catch (e: any) {
		toast.add({ title: 'Gagal membaca sitemap', description: e.message, color: 'error' })
	}
}

function addCustomReferrer() {
	const val = customReferrer.value.trim()
	if (!val) return
	if (!selectedReferrers.value.includes(val)) {
		selectedReferrers.value.push(val)
	}
	customReferrer.value = ''
}

// Proxies actions
function applyProxies() {
	traffic.setProxyList(rawProxyInput.value)
	toast.add({ title: `${traffic.proxies.value.length} proxy berhasil dimuat`, color: 'success' })
}

async function handleFetchProxyFeed() {
	const u = proxyFeedUrl.value.trim()
	if (!u) return
	loadingProxyFeed.value = true
	try {
		const count = await traffic.importProxiesFromUrl(u)
		rawProxyInput.value = traffic.proxies.value.map(p => p.raw).join('\n')
		toast.add({ title: `${count} proxy berhasil diimpor dari URL`, color: 'success' })
	} catch (e: any) {
		toast.add({ title: 'Gagal mengimpor proxy dari URL', description: e.message, color: 'error' })
	} finally {
		loadingProxyFeed.value = false
	}
}

async function handlePickProxyFile() {
	const file = await pickFile(['txt'], 'Pilih Berkas Daftar Proxy')
	if (!file) return
	try {
		const { invoke } = await import('@tauri-apps/api/core')
		const text = await invoke<string>('read_text', { path: file })
		traffic.setProxyList(text)
		rawProxyInput.value = text
		toast.add({ title: `${traffic.proxies.value.length} proxy dimuat dari berkas`, color: 'success' })
	} catch (e: any) {
		toast.add({ title: 'Gagal membaca berkas', description: e.message, color: 'error' })
	}
}

async function testAllProxies() {
	if (traffic.proxies.value.length === 0) {
		applyProxies()
	}
	testingProxies.value = true
	try {
		await traffic.testAllProxies(testTargetUrl.value, proxySensitivityMs.value)
		toast.add({ title: 'Pengujian proxy selesai', color: 'success' })
	} finally {
		testingProxies.value = false
	}
}

function removeDeadProxies() {
	const alive = traffic.proxies.value.filter(p => p.status !== 'dead')
	traffic.proxies.value = alive
	rawProxyInput.value = alive.map(p => p.raw).join('\n')
	toast.add({ title: 'Proxy yang mati telah dihapus dari daftar', color: 'info' })
}

// Campaign Runner
function getCleanConfig(): CampaignConfig {
	const urls = rawUrls.value
		.split('\n')
		.map(u => u.trim())
		.filter(u => /^https?:\/\//i.test(u))

	const keywords = rawKeywords.value
		.split('\n')
		.map(k => k.trim())
		.filter(Boolean)

	return {
		name: campaignName.value,
		urls,
		mode: trafficMode.value,
		preset: selectedPreset.value,
		keywords,
		searchEngines: selectedEngines.value,
		referrers: selectedReferrers.value,
		utm: { ...utmConfig, enabled: trafficMode.value === 'campaign_utm' || utmConfig.enabled },
		dwellTimeMin: dwellTimeMin.value,
		dwellTimeMax: dwellTimeMax.value,
		concurrency: concurrency.value,
		targetHits: targetHits.value,
		enableSurfing: enableSurfing.value,
		surfingPagesMin: surfingPagesMin.value,
		surfingPagesMax: surfingPagesMax.value,
		deviceRatio: deviceRatio.value,
		useProxies: useProxies.value,
		proxySensitivityMs: proxySensitivityMs.value,
		autoStopMinutes: autoStopMinutes.value
	}
}

async function handleStart() {
	try {
		const cfg = getCleanConfig()
		if (cfg.urls.length === 0) {
			toast.add({
				title: 'URL Target Kosong',
				description: 'Masukkan setidaknya satu URL target yang valid (diawali http:// atau https://)',
				color: 'error'
			})
			return
		}
		if (cfg.useProxies && traffic.proxies.value.length === 0) {
			toast.add({
				title: 'Proxy Belum Diatur',
				description: 'Anda mengaktifkan opsi proxy tetapi daftar proxy masih kosong',
				color: 'warning'
			})
		}
		activeTab.value = 'monitor'
		await traffic.startCampaign(cfg)
		toast.add({ title: 'Kampanye trafik berhasil dimulai', color: 'success' })
	} catch (e: any) {
		toast.add({ title: 'Gagal memulai kampanye', description: e.message, color: 'error' })
	}
}

function handleExportLogs() {
	if (traffic.logs.value.length === 0) {
		toast.add({ title: 'Belum ada log untuk diekspor', color: 'warning' })
		return
	}
	const headers = ['Waktu', 'URL Target', 'Mode', 'Referrer', 'User-Agent', 'Proxy', 'Status', 'Durasi (ms)', 'Internal Hop', 'Error']
	const rows = traffic.logs.value.map(l => [
		l.timestamp,
		l.url,
		l.mode,
		l.referrer || '-',
		l.userAgent,
		l.proxy || 'Direct',
		String(l.status),
		String(l.durationMs),
		String(l.internalPagesVisited || 0),
		l.error || '-'
	])
	exportCsv(`traffic-logs-${Date.now()}.csv`, headers, rows)
	toast.add({ title: 'Log berhasil diekspor ke CSV', color: 'success' })
}

// Auto-fill active site on mount if available
onMounted(() => {
	loadSavedProfiles()
	if (site.value && !rawUrls.value) {
		rawUrls.value = site.value
	}
})
</script>

<template>
	<div class="space-y-6">
		<PageHead
			title="Generator Trafik Otomatis"
			description="Simulator kunjungan otomatis (TorPedo Ultimate): Organik, Referral, UTM Kampanye, Dwell Time, Surfing Mode, dan Rotasi Proxy."
		>
			<template #actions>
				<div class="flex flex-wrap items-center gap-2">
					<UButton
						v-if="!traffic.isRunning.value"
						icon="ph:play"
						label="Mulai Kunjungan"
						color="primary"
						@click="handleStart"
					/>
					<template v-else>
						<UButton
							v-if="!traffic.isPaused.value"
							icon="ph:pause"
							label="Jeda"
							color="neutral"
							variant="outline"
							@click="traffic.pauseCampaign"
						/>
						<UButton
							v-else
							icon="ph:play"
							label="Lanjutkan"
							color="primary"
							@click="traffic.resumeCampaign"
						/>
						<UButton
							icon="ph:stop"
							label="Hentikan"
							color="error"
							@click="traffic.stopCampaign"
						/>
					</template>
				</div>
			</template>
		</PageHead>

		<!-- Tabs -->
		<div class="flex flex-wrap gap-2 border-b border-default pb-3 mb-6">
			<button
				v-for="t in tabItems"
				:key="t.value"
				type="button"
				class="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors"
				:class="activeTab === t.value ? 'bg-[var(--ui-primary)] text-white shadow-xs font-semibold' : 'bg-elevated/70 text-muted hover:bg-elevated hover:text-highlighted'"
				@click="setTab(t.value)"
			>
				<UIcon
					:name="t.icon"
					class="size-4"
				/>
				{{ t.label }}
			</button>
		</div>

		<!-- TAB 1: KONFIGURASI KAMPANYE -->
		<div
			v-if="activeTab === 'campaign'"
			class="space-y-6"
		>
			<!-- Nama Kampanye & Profil -->
			<div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default bg-elevated/40 p-4">
				<div class="flex flex-1 min-w-[260px] items-center gap-3">
					<label
						for="campaign-name"
						class="text-xs font-semibold text-highlighted whitespace-nowrap"
					>Nama Kampanye:</label>
					<UInput
						id="campaign-name"
						v-model="campaignName"
						placeholder="Contoh: Kunjungan Organik Google"
						class="flex-1 text-xs"
					/>
				</div>
				<div class="flex items-center gap-2">
					<UButton
						size="xs"
						icon="ph:bookmark-simple"
						label="Simpan Profil"
						color="neutral"
						variant="soft"
						@click="saveCurrentProfile"
					/>
				</div>
			</div>

			<!-- URLs Target -->
			<div class="rounded-lg border border-default bg-elevated/40 p-5">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div>
						<h3 class="font-semibold text-highlighted">URL Target Halaman</h3>
						<p class="text-xs text-muted">Masukkan satu URL per baris yang ingin menerima kunjungan.</p>
					</div>
					<div class="flex gap-2">
						<UButton
							size="xs"
							variant="soft"
							color="neutral"
							label="Dari Situs Aktif"
							icon="ph:globe"
							@click="fillFromActiveSite"
						/>
						<UButton
							size="xs"
							variant="soft"
							color="neutral"
							label="Impor Sitemap"
							icon="ph:tree-structure"
							@click="importFromSitemap"
						/>
						<UButton
							size="xs"
							variant="ghost"
							color="neutral"
							label="Kosongkan"
							@click="rawUrls = ''"
						/>
					</div>
				</div>
				<UTextarea
					v-model="rawUrls"
					:rows="4"
					placeholder="https://contoh-website.com/&#10;https://contoh-website.com/artikel-1&#10;https://contoh-website.com/produk"
					class="font-mono text-xs w-full"
				/>
			</div>

			<!-- Mode Trafik & Sumber -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div class="rounded-lg border border-default bg-elevated/40 p-5 space-y-4">
					<h3 class="font-semibold text-highlighted">Mode Trafik</h3>
					<div class="space-y-3">
						<label
							v-for="opt in trafficModeOptions"
							:key="opt.value"
							class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
							:class="trafficMode === opt.value ? 'border-[var(--ui-primary)] bg-elevated' : 'border-default bg-transparent'"
						>
							<input
								v-model="trafficMode"
								type="radio"
								name="trafficMode"
								:value="opt.value"
								class="mt-1"
							>
							<div>
								<div class="text-sm font-medium text-highlighted">{{ opt.label }}</div>
								<div class="text-xs text-muted">{{ opt.description }}</div>
							</div>
						</label>
					</div>
				</div>

				<!-- Pengaturan Khusus per Mode -->
				<div class="rounded-lg border border-default bg-elevated/40 p-5 space-y-4">
					<!-- ORGANIC OPTIONS -->
					<template v-if="trafficMode === 'organic'">
						<h3 class="font-semibold text-highlighted">Pengaturan Pencarian Organik</h3>
						<div>
							<label class="mb-1 block text-xs font-medium text-muted">Mesin Pencari Target</label>
							<div class="flex flex-wrap gap-2">
								<UCheckbox
									v-for="eng in SEARCH_ENGINE_OPTIONS"
									:key="eng.value"
									:label="eng.label"
									:model-value="selectedEngines.includes(eng.value)"
									@update:model-value="(val) => {
										if (val) selectedEngines.push(eng.value)
										else selectedEngines = selectedEngines.filter(e => e !== eng.value)
									}"
								/>
							</div>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-muted">Daftar Kata Kunci (satu per baris)</label>
							<UTextarea
								v-model="rawKeywords"
								:rows="3"
								placeholder="jasa pembuatan website&#10;harga software cbt&#10;tutorial seo pemula"
								class="text-xs font-mono w-full"
							/>
						</div>
					</template>

					<!-- REFERRAL OPTIONS -->
					<template v-else-if="trafficMode === 'referral'">
						<h3 class="font-semibold text-highlighted">Sumber Referral Media Sosial</h3>
						<div>
							<label class="mb-1 block text-xs font-medium text-muted">Preset Jejaring Sosial</label>
							<div class="grid grid-cols-2 gap-2">
								<UCheckbox
									v-for="refPreset in REFERRER_PRESETS"
									:key="refPreset.value"
									:label="refPreset.label"
									:model-value="selectedReferrers.includes(refPreset.value)"
									@update:model-value="(val) => {
										if (val) selectedReferrers.push(refPreset.value)
										else selectedReferrers = selectedReferrers.filter(r => r !== refPreset.value)
									}"
								/>
							</div>
						</div>
						<div class="pt-2">
							<label class="mb-1 block text-xs font-medium text-muted">Tambah Referrer Kustom</label>
							<div class="flex gap-2">
								<UInput
									v-model="customReferrer"
									placeholder="https://forum-diskusi.com/thread/123"
									class="flex-1 text-xs"
								/>
								<UButton
									size="xs"
									label="Tambah"
									color="neutral"
									@click="addCustomReferrer"
								/>
							</div>
						</div>
					</template>

					<!-- UTM CAMPAIGN OPTIONS -->
					<template v-else-if="trafficMode === 'campaign_utm'">
						<h3 class="font-semibold text-highlighted">Parameter Kampanye UTM (Google Analytics)</h3>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="block text-xs font-medium text-muted mb-1">utm_source</label>
								<UInput
									v-model="utmConfig.source"
									placeholder="google / newsletter / facebook"
									class="text-xs w-full"
								/>
							</div>
							<div>
								<label class="block text-xs font-medium text-muted mb-1">utm_medium</label>
								<UInput
									v-model="utmConfig.medium"
									placeholder="cpc / email / banner"
									class="text-xs w-full"
								/>
							</div>
							<div>
								<label class="block text-xs font-medium text-muted mb-1">utm_campaign</label>
								<UInput
									v-model="utmConfig.campaign"
									placeholder="promo_lebaran / launch"
									class="text-xs w-full"
								/>
							</div>
							<div>
								<label class="block text-xs font-medium text-muted mb-1">utm_term</label>
								<UInput
									v-model="utmConfig.term"
									placeholder="kata_kunci"
									class="text-xs w-full"
								/>
							</div>
						</div>
					</template>

					<!-- DIRECT OPTIONS -->
					<template v-else>
						<h3 class="font-semibold text-highlighted">Kunjungan Langsung (Direct)</h3>
						<p class="text-xs text-muted">
							Permintaan akan dikirimkan tanpa header <code>Referer</code>. Google Analytics akan mencatat kunjungan ini sebagai <strong>Direct Traffic</strong>.
						</p>
					</template>
				</div>
			</div>

			<!-- Surfing Mode & Perilaku Pengunjung -->
			<div class="rounded-lg border border-default bg-elevated/40 p-5 space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
					<div>
						<h3 class="font-semibold text-highlighted">Surfing Mode (Penjelajahan Halaman Internal)</h3>
						<p class="text-xs text-muted">Setelah membuka halaman utama, simulator otomatis mengklik dan membaca 1-3 tautan internal di situs yang sama.</p>
					</div>
					<USwitch v-model="enableSurfing" />
				</div>

				<div
					v-if="enableSurfing"
					class="grid grid-cols-2 gap-4"
				>
					<div>
						<label class="mb-1 block text-xs font-medium text-muted">Min Halaman Internal per Sesi</label>
						<UInput
							v-model.number="surfingPagesMin"
							type="number"
							:min="1"
							:max="10"
							class="w-full"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-muted">Max Halaman Internal per Sesi</label>
						<UInput
							v-model.number="surfingPagesMax"
							type="number"
							:min="1"
							:max="10"
							class="w-full"
						/>
					</div>
				</div>

				<!-- Pacing & Timing -->
				<div class="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<label class="mb-1 block text-xs font-medium text-muted">Dwell Time Min (Detik)</label>
						<UInput
							v-model.number="dwellTimeMin"
							type="number"
							:min="1"
							:max="300"
							class="w-full"
						/>
						<span class="text-[11px] text-muted">Jeda minimum antar hit</span>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-muted">Dwell Time Max (Detik)</label>
						<UInput
							v-model.number="dwellTimeMax"
							type="number"
							:min="1"
							:max="300"
							class="w-full"
						/>
						<span class="text-[11px] text-muted">Jeda maksimum acak</span>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-muted">Konkurensi (Thread)</label>
						<UInput
							v-model.number="concurrency"
							type="number"
							:min="1"
							:max="20"
							class="w-full"
						/>
						<span class="text-[11px] text-muted">1 s/d 20 proses simultan</span>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-muted">Target Hit Batas</label>
						<UInput
							v-model.number="targetHits"
							type="number"
							:min="0"
							class="w-full"
						/>
						<span class="text-[11px] text-muted">0 = tanpa batas hit</span>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-6 pt-3 sm:grid-cols-3">
					<div>
						<label class="mb-1 block text-xs font-medium text-muted">Profil Perangkat (User-Agent)</label>
						<USelect
							v-model="deviceRatio"
							:items="deviceRatioOptions"
							class="w-full"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-muted">Otomatis Berhenti Setelah (Menit)</label>
						<UInput
							v-model.number="autoStopMinutes"
							type="number"
							:min="0"
							placeholder="0 = terus berjalan"
							class="w-full"
						/>
					</div>
					<div class="flex items-center gap-3 pt-4">
						<USwitch v-model="useProxies" />
						<div>
							<div class="text-sm font-medium text-highlighted">Gunakan Rotasi Proxy</div>
							<div class="text-xs text-muted">Gilir alamat IP dari tab Pengelola Proxy</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- TAB 2: PRESET STRATEGI -->
		<div
			v-if="activeTab === 'presets'"
			class="space-y-6"
		>
			<div class="rounded-lg border border-default bg-elevated/40 p-5 space-y-4">
				<div>
					<h3 class="font-semibold text-highlighted">Strategi Optimasi Cepat (TorPedo Ultimate Presets)</h3>
					<p class="text-xs text-muted">
						Pilih salah satu preset di bawah untuk menerapkan durasi sesi, dwell time, dan surfing mode yang telah disesuaikan untuk kebutuhan analitik tertentu.
					</p>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<div
						v-for="pr in presetOptions"
						:key="pr.value"
						class="flex flex-col justify-between rounded-lg border p-4 transition-all"
						:class="selectedPreset === pr.value ? 'border-[var(--ui-primary)] bg-elevated shadow-sm' : 'border-default bg-default/60'"
					>
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<h4 class="font-semibold text-highlighted text-sm">{{ pr.label }}</h4>
								<UBadge
									v-if="selectedPreset === pr.value"
									color="primary"
									variant="subtle"
									size="xs"
									label="Aktif"
								/>
							</div>
							<p class="text-xs text-muted leading-relaxed">{{ pr.description }}</p>
						</div>
						<div class="pt-4">
							<UButton
								size="xs"
								label="Terapkan Strategi Ini"
								:variant="selectedPreset === pr.value ? 'solid' : 'soft'"
								color="primary"
								block
								@click="handleApplyPreset(pr.value)"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Profil Tersimpan -->
			<div class="rounded-lg border border-default bg-elevated/40 p-5 space-y-4">
				<h3 class="font-semibold text-highlighted">Profil Kampanye Tersimpan</h3>
				<div
					v-if="savedProfiles.length > 0"
					class="divide-y divide-default rounded-lg border border-default overflow-hidden"
				>
					<div
						v-for="p in savedProfiles"
						:key="p.id"
						class="flex items-center justify-between p-3.5 hover:bg-elevated/60"
					>
						<div>
							<div class="font-medium text-highlighted text-sm">{{ p.name }}</div>
							<div class="text-xs text-muted">Disimpan: {{ p.savedAt }} • Mode: {{ p.config.mode }} • Target: {{ p.config.urls?.length || 0 }} URL</div>
						</div>
						<div class="flex items-center gap-2">
							<UButton
								size="xs"
								label="Muat"
								color="primary"
								variant="soft"
								icon="ph:arrow-right"
								@click="applySavedProfile(p)"
							/>
							<UButton
								size="xs"
								icon="ph:trash"
								color="error"
								variant="ghost"
								@click="deleteSavedProfile(p.id)"
							/>
						</div>
					</div>
				</div>
				<StateBox
					v-else
					type="empty"
					title="Belum ada profil kampanye tersimpan"
					description="Anda dapat menyimpan pengaturan kampanye di tab Konfigurasi dengan menekan tombol 'Simpan Profil'."
				/>
			</div>
		</div>

		<!-- TAB 3: PENGELOLA PROXY -->
		<div
			v-if="activeTab === 'proxies'"
			class="space-y-6"
		>
			<div class="rounded-lg border border-default bg-elevated/40 p-5 space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h3 class="font-semibold text-highlighted">Daftar Proxy HTTP/HTTPS</h3>
						<p class="text-xs text-muted">
							Format didukung: <code>host:port</code>, <code>host:port:user:pass</code>, atau <code>http://user:pass@host:port</code>.
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<UButton
							size="xs"
							label="Buka File .txt"
							icon="ph:file-text"
							color="neutral"
							variant="outline"
							@click="handlePickProxyFile"
						/>
						<UButton
							size="xs"
							label="Simpan Daftar"
							icon="ph:floppy-disk"
							color="neutral"
							@click="applyProxies"
						/>
						<UButton
							size="xs"
							label="Tes Semua Proxy"
							icon="ph:lightning"
							color="primary"
							:loading="testingProxies"
							@click="testAllProxies"
						/>
						<UButton
							size="xs"
							label="Hapus Proxy Mati"
							icon="ph:trash"
							color="error"
							variant="soft"
							@click="removeDeadProxies"
						/>
					</div>
				</div>

				<!-- Import from URL Feed -->
				<div class="flex flex-wrap items-center gap-2 rounded-md border border-default bg-default/40 p-3">
					<label class="text-xs font-medium text-muted">Impor dari URL Feed API:</label>
					<UInput
						v-model="proxyFeedUrl"
						placeholder="https://api.proxyscrape.com/v2/?request=getproxies&protocol=http"
						class="flex-1 text-xs"
					/>
					<UButton
						size="xs"
						label="Unduh Proxy"
						color="neutral"
						variant="soft"
						:loading="loadingProxyFeed"
						@click="handleFetchProxyFeed"
					/>
				</div>

				<UTextarea
					v-model="rawProxyInput"
					:rows="6"
					placeholder="103.152.112.12:8080&#10;185.199.229.156:7492:username:password&#10;http://user:pass@45.140.88.22:3128"
					class="font-mono text-xs w-full"
				/>

				<!-- Status Cards -->
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div class="rounded-md border border-default bg-elevated p-3">
						<div class="text-xs text-muted">Total Proxy</div>
						<div class="text-xl font-bold text-highlighted">{{ traffic.proxies.value.length }}</div>
					</div>
					<div class="rounded-md border border-default bg-elevated p-3">
						<div class="text-xs text-muted">Aktif (Cepat &lt;800ms)</div>
						<div class="text-xl font-bold text-emerald-500">
							{{ traffic.proxies.value.filter(p => p.status === 'alive' && p.speedCategory === 'fast').length }}
						</div>
					</div>
					<div class="rounded-md border border-default bg-elevated p-3">
						<div class="text-xs text-muted">Aktif (Sedang)</div>
						<div class="text-xl font-bold text-amber-500">
							{{ traffic.proxies.value.filter(p => p.status === 'alive' && p.speedCategory !== 'fast').length }}
						</div>
					</div>
					<div class="rounded-md border border-default bg-elevated p-3">
						<div class="text-xs text-muted">Mati / Timeout</div>
						<div class="text-xl font-bold text-rose-500">
							{{ traffic.proxies.value.filter(p => p.status === 'dead').length }}
						</div>
					</div>
				</div>

				<!-- Tabel Proxy Terdaftar -->
				<div
					v-if="traffic.proxies.value.length > 0"
					class="overflow-x-auto rounded-lg border border-default max-h-[350px] overflow-y-auto"
				>
					<table class="w-full text-left text-xs">
						<thead class="sticky top-0 bg-muted/80 backdrop-blur text-muted">
							<tr>
								<th class="p-2.5">Proxy URL</th>
								<th class="p-2.5">Autentikasi</th>
								<th class="p-2.5">Status</th>
								<th class="p-2.5">Kecepatan</th>
								<th class="p-2.5">Latensi</th>
								<th class="p-2.5">Terakhir Diuji</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-default">
							<tr
								v-for="(p, idx) in traffic.proxies.value"
								:key="idx"
								class="hover:bg-elevated/50 font-mono text-[11px]"
							>
								<td class="p-2.5">{{ p.url }}</td>
								<td class="p-2.5">
									<span
										v-if="p.auth"
										class="text-emerald-500"
									>Ya ({{ p.auth.username }})</span>
									<span
										v-else
										class="text-muted"
									>Tanpa Sandi</span>
								</td>
								<td class="p-2.5">
									<UBadge
										v-if="p.status === 'alive'"
										color="success"
										variant="subtle"
										size="xs"
										label="Hidup"
									/>
									<UBadge
										v-else-if="p.status === 'dead'"
										color="error"
										variant="subtle"
										size="xs"
										label="Mati"
									/>
									<UBadge
										v-else
										color="neutral"
										variant="subtle"
										size="xs"
										label="Belum Diuji"
									/>
								</td>
								<td class="p-2.5">
									<span
										v-if="p.speedCategory === 'fast'"
										class="text-emerald-500 font-semibold"
									>Cepat</span>
									<span
										v-else-if="p.speedCategory === 'medium'"
										class="text-amber-500 font-semibold"
									>Sedang</span>
									<span
										v-else-if="p.speedCategory === 'slow'"
										class="text-rose-500 font-semibold"
									>Lambat</span>
									<span
										v-else
										class="text-muted"
									>-</span>
								</td>
								<td class="p-2.5">
									<span v-if="p.latencyMs !== undefined">{{ p.latencyMs }} ms</span>
									<span
										v-else
										class="text-muted"
									>-</span>
								</td>
								<td class="p-2.5 text-muted">{{ p.lastChecked || '-' }}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- TAB 4: MONITOR LANGSUNG -->
		<div
			v-if="activeTab === 'monitor'"
			class="space-y-6"
		>
			<!-- METRIC CARDS -->
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				<div class="rounded-lg border border-default bg-elevated/40 p-4">
					<div class="text-xs text-muted">Total Sesi Kunjungan</div>
					<div class="text-2xl font-bold tracking-tight text-highlighted">{{ traffic.stats.value.total }}</div>
				</div>
				<div class="rounded-lg border border-default bg-elevated/40 p-4">
					<div class="text-xs text-muted">Berhasil (2xx)</div>
					<div class="text-2xl font-bold tracking-tight text-emerald-500">{{ traffic.stats.value.success }}</div>
				</div>
				<div class="rounded-lg border border-default bg-elevated/40 p-4">
					<div class="text-xs text-muted">Gagal / Timeout</div>
					<div class="text-2xl font-bold tracking-tight text-rose-500">{{ traffic.stats.value.failed }}</div>
				</div>
				<div class="rounded-lg border border-default bg-elevated/40 p-4">
					<div class="text-xs text-muted">Hop Halaman Internal</div>
					<div class="text-2xl font-bold tracking-tight text-purple-500">{{ traffic.stats.value.surfingPagesVisited }}</div>
				</div>
				<div class="rounded-lg border border-default bg-elevated/40 p-4">
					<div class="text-xs text-muted">Kecepatan (Hit/Menit)</div>
					<div class="text-2xl font-bold tracking-tight text-sky-500">{{ traffic.stats.value.hitsPerMin }}</div>
				</div>
				<div class="rounded-lg border border-default bg-elevated/40 p-4">
					<div class="text-xs text-muted">Rerata Latensi</div>
					<div class="text-2xl font-bold tracking-tight text-amber-500">{{ traffic.stats.value.avgLatencyMs }} ms</div>
				</div>
			</div>

			<!-- CONTROLS & LOG VIEWER -->
			<div class="rounded-lg border border-default bg-elevated/40 p-5 space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<h3 class="font-semibold text-highlighted">Log Aktivitas Kunjungan</h3>
						<span class="rounded-full bg-muted/30 px-2 py-0.5 text-xs text-muted">
							{{ traffic.logs.value.length }} log tersimpan
						</span>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<UButton
							size="xs"
							label="Reset Metrik"
							icon="ph:arrow-counter-clockwise"
							color="neutral"
							variant="ghost"
							@click="traffic.resetStats"
						/>
						<UButton
							size="xs"
							label="Ekspor Log CSV"
							icon="ph:download-simple"
							color="neutral"
							variant="soft"
							@click="handleExportLogs"
						/>
					</div>
				</div>

				<!-- LOGS TABLE -->
				<div
					v-if="traffic.logs.value.length > 0"
					class="overflow-x-auto rounded-lg border border-default max-h-[480px] overflow-y-auto"
				>
					<table class="w-full text-left text-xs">
						<thead class="sticky top-0 bg-muted/80 backdrop-blur text-muted">
							<tr>
								<th class="p-2.5">Waktu</th>
								<th class="p-2.5">Status</th>
								<th class="p-2.5">Mode</th>
								<th class="p-2.5">Target URL</th>
								<th class="p-2.5">Hop Internal</th>
								<th class="p-2.5">Referrer</th>
								<th class="p-2.5">Proxy</th>
								<th class="p-2.5">Durasi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-default">
							<tr
								v-for="l in traffic.logs.value"
								:key="l.id"
								class="hover:bg-elevated/50 font-mono text-[11px]"
							>
								<td class="p-2.5 text-muted whitespace-nowrap">{{ l.timestamp }}</td>
								<td class="p-2.5">
									<div class="flex flex-col">
										<span
											v-if="typeof l.status === 'number' && l.status >= 200 && l.status < 400"
											class="font-bold text-emerald-500"
										>
											{{ l.status }} OK
										</span>
										<span
											v-else-if="typeof l.status === 'number'"
											class="font-bold text-rose-500"
										>
											{{ l.status }} ERR
										</span>
										<span
											v-else
											class="font-bold text-rose-500"
										>
											ERR
										</span>
										<span
											v-if="l.error"
											class="text-[10px] text-rose-400 font-sans max-w-[160px] truncate"
											:title="l.error"
										>
											{{ l.error }}
										</span>
									</div>
								</td>
								<td class="p-2.5 capitalize whitespace-nowrap font-sans">{{ l.mode }}</td>
								<td
									class="p-2.5 max-w-[200px] truncate"
									:title="l.url"
								>{{ l.url }}</td>
								<td class="p-2.5 text-center font-sans">
									<UBadge
										v-if="l.internalPagesVisited"
										color="primary"
										variant="subtle"
										size="xs"
										:label="`+${l.internalPagesVisited} halaman`"
									/>
									<span
										v-else
										class="text-muted"
									>0</span>
								</td>
								<td
									class="p-2.5 max-w-[200px] truncate text-muted"
									:title="l.referrer"
								>
									{{ l.referrer || '(Direct)' }}
								</td>
								<td class="p-2.5 text-muted whitespace-nowrap">{{ l.proxy || 'Direct' }}</td>
								<td class="p-2.5 whitespace-nowrap">{{ l.durationMs }} ms</td>
							</tr>
						</tbody>
					</table>
				</div>

				<StateBox
					v-else
					type="empty"
					title="Belum ada aktivitas kunjungan"
					description="Pilih URL target di tab Konfigurasi lalu tekan tombol Mulai Kunjungan untuk menjalankan generator trafik."
				/>
			</div>
		</div>
	</div>
</template>
